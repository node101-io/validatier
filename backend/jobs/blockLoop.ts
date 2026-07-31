import { getSqlite } from '../db/sqlite';
import { chainClient } from '../chain/client';
import { parseBlockResults, parseValidatorLifecycleEvents, type RealTransfer } from '../chain/blockResults';
import { processTransfer } from '../engine/pipeline';
import { getCursor, advanceCursor } from '../store/meta';
import { handleCreateValidator, handleSetWithdrawAddress } from '../ingest/validatorLifecycle';

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
//
// Validator lifecycle (create_validator / set_withdraw_address): handled per
// height BEFORE the transfer transaction — see ingest/validatorLifecycle.ts
// for why these don't need to share that transaction (they're individually
// idempotent, so redoing a height on crash-retry is still safe).

export interface BlockLoopStats {
  from: number;
  to: number;
  heightsProcessed: number;
  transfersSeen: number;
  validatorsCreated: number;
  withdrawOverridesApplied: number;
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
  const latest = (await chainClient.getStatus()).syncInfo.latestBlockHeight;

  // First-ever run (cursor never set): pruned public nodes can't serve
  // historical block_results (docs/02) — start at the current tip and go
  // forward only, until an archive node exists (CLAUDE.md deferred item).
  const from = cursor.height > 0 ? cursor.height + 1 : latest;
  const to = latest;

  let heightsProcessed = 0;
  let transfersSeen = 0;
  let validatorsCreated = 0;
  let withdrawOverridesApplied = 0;

  for (let height = from; height <= to; height++) {
    const [blockResults, block] = await Promise.all([
      chainClient.getBlockResults(height),
      chainClient.getBlock(height),
    ]);
    const ts = Math.floor(block.block.header.time.getTime() / 1000);
    const transfers = parseBlockResults(blockResults);
    const lifecycle = parseValidatorLifecycleEvents(blockResults);

    // Lifecycle events run BEFORE the height's money-transfer transaction,
    // as plain (non-transactional) async calls — each is individually
    // idempotent, so redoing this height on a crash-retry is still safe
    // (see file header). This must happen before applyHeight so that a
    // reward claim later in the SAME height already sees an up-to-date
    // withdraw_map (e.g. a same-block create + first claim, however rare).
    for (const e of lifecycle.createValidator) {
      await handleCreateValidator(e);
      validatorsCreated++;
    }
    for (const e of lifecycle.setWithdrawAddress) {
      if (await handleSetWithdrawAddress(e)) withdrawOverridesApplied++;
    }

    applyHeight(height, ts, transfers);

    heightsProcessed++;
    transfersSeen += transfers.length;
  }

  return { from, to, heightsProcessed, transfersSeen, validatorsCreated, withdrawOverridesApplied };
}
