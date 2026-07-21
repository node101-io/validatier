import { getSqlite } from '../db/sqlite';
import { chainClient } from '../chain/client';
import { parseBlockResults, type RealTransfer } from '../chain/blockResults';
import { processTransfer } from '../engine/pipeline';
import { getCursor, advanceCursor } from '../store/meta';

// The main block loop (docs/01 "Data flow"): a single forward scan over
// heights. One invocation catches up from the persisted cursor to the
// current chain tip, then returns — an external scheduler (task 10.2) is
// expected to call this repeatedly (same one-shot-function shape as
// jobs/validatorStats.ts and jobs/priceSync.ts).
//
// Crash safety ("restart resumes" — TASKS.md 10.1 accept criteria): each
// height's ENTIRE effect (every transfer applied via processTransfer, THEN
// the cursor bump) is wrapped in ONE SQLite transaction. better-sqlite3
// nests transactions via SAVEPOINTs, so this composes safely with seed.ts's
// and contraction.ts's own internal transactions. If anything throws
// mid-height, the whole height rolls back — the cursor stays at the last
// fully-committed height, and the next call cleanly retries that same
// height from scratch (never double-applies a partially-processed height).
//
// Failure policy: chainClient already retries transient errors internally.
// If a height still can't be fetched after that, this throws and STOPS —
// never skips a height and never guesses. The caller (test script now, the
// 10.2 scheduler later) decides when to retry.

export interface BlockLoopStats {
  from: number;
  to: number;
  heightsProcessed: number;
  transfersSeen: number;
}

let heightTxn: ((height: number, ts: number, transfers: RealTransfer[]) => void) | null = null;

function applyHeight(height: number, ts: number, transfers: RealTransfer[]): void {
  if (!heightTxn) {
    heightTxn = getSqlite().transaction(
      (h: number, t: number, xs: RealTransfer[]): void => {
        for (const transfer of xs) processTransfer(transfer, { height: h, ts: t });
        advanceCursor(h, t);
      }
    );
  }
  heightTxn(height, ts, transfers);
}

export async function runBlockLoop(): Promise<BlockLoopStats> {
  const cursor = getCursor();
  const latest = Number((await chainClient.getStatus()).sync_info.latest_block_height);

  // First-ever run (cursor never set): pruned public nodes can't serve
  // historical block_results (docs/02) — start at the current tip and go
  // forward only, until an archive node exists (CLAUDE.md deferred item).
  const from = cursor.height > 0 ? cursor.height + 1 : latest;
  const to = latest;

  let heightsProcessed = 0;
  let transfersSeen = 0;

  for (let height = from; height <= to; height++) {
    const [blockResults, block] = await Promise.all([
      chainClient.getBlockResults(height),
      chainClient.getBlock(height),
    ]);
    const ts = Math.floor(new Date(block.block.header.time).getTime() / 1000);
    const transfers = parseBlockResults(blockResults);

    applyHeight(height, ts, transfers);

    heightsProcessed++;
    transfersSeen += transfers.length;
  }

  return { from, to, heightsProcessed, transfersSeen };
}
