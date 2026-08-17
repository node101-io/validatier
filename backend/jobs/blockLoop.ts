import { getSqlite } from '../db/sqlite';
import { chainClient } from '../chain/client';
import { parseBlockResults, parseValidatorLifecycleEvents, type RealTransfer } from '../chain/blockResults';
import { processTransfer } from '../engine/pipeline';
import { getCursor, advanceCursor, getLastDailyRunDay, type Cursor } from '../store/meta';
import { handleCreateValidator, handleSetWithdrawAddress } from '../ingest/validatorLifecycle';
import { runDailyJobsForDay } from './dailyJobs';
import { config } from '../config';

// The main block loop (docs/01 "Data flow"): a single forward scan over
// heights. One invocation catches up from the persisted cursor to the
// current chain tip, then returns — the scheduler (jobs/scheduler.ts) calls
// this repeatedly via a self-rescheduling recursive loop, not a fixed timer.
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
// scheduler later) decides when to retry.
//
// Validator lifecycle (create_validator / set_withdraw_address): handled per
// height BEFORE the transfer transaction — see ingest/validatorLifecycle.ts
// for why these don't need to share that transaction (they're individually
// idempotent, so redoing a height on crash-retry is still safe).
//
// Daily jobs (block-time driven, not wall-clock cron): right after a
// height's transaction commits, this height's timestamp is compared to the
// `last_daily_run_day` SQLite marker. The moment they differ, the full daily
// sequence (fund-flow snapshot -> validator_stats -> price sync) runs inline
// and is awaited before moving to the next height — see jobs/dailyJobs.ts.
// A thrown error there is caught and logged, NOT rethrown: the marker stays
// unset, so the very next height's day-check retries it (no wall-clock
// polling gap, no separate timer).

export interface BlockLoopStats {
  from: number;
  to: number;
  heightsProcessed: number;
  transfersSeen: number;
  validatorsCreated: number;
  withdrawOverridesApplied: number;
}

let heightTxn: ((height: number, ts: number, transfers: RealTransfer[]) => void) | null = null;

const AVG_BLOCK_TIME_SECONDS = 6; // cosmoshub target block time

export function utcDayFromTs(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

// Pure decision logic for where to start scanning, extracted for direct unit
// testing (see blockLoop.test.ts) without needing to mock chainClient/RPC:
//   - cursor.height === 0 (fresh deploy): start `lookbackBlocks` behind the tip.
//   - cursor stale (gap beyond lookbackBlocks, e.g. long downtime, node pruned
//     those heights): jump forward the same way, logging a warning.
//   - otherwise: normal resume at cursor.height + 1.
export function computeFromHeight(cursor: Cursor, latest: number, lookbackBlocks: number): number {
  if (cursor.height === 0) {
    return Math.max(1, latest - lookbackBlocks);
  }
  if (latest - cursor.height > lookbackBlocks) {
    console.warn(
      `cursor stale: height=${cursor.height} tip=${latest} gap=${latest - cursor.height} ` +
        `exceeds lookback=${lookbackBlocks} blocks — jumping forward, accepting the gap`
    );
    return latest - lookbackBlocks;
  }
  return cursor.height + 1;
}

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

  // How far back we can realistically go: no archive node yet (CLAUDE.md
  // deferred item), so this should stay at/under the public RPC's measured
  // pruning depth (docs/02) — see config.backfillLookbackDays / .env.example.
  const lookbackBlocks = Math.floor((config.backfillLookbackDays * 86400) / AVG_BLOCK_TIME_SECONDS);
  const from = computeFromHeight(cursor, latest, lookbackBlocks);
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

    const blockDay = utcDayFromTs(ts);
    if (blockDay !== getLastDailyRunDay()) {
      try {
        await runDailyJobsForDay(blockDay);
      } catch (err) {
        console.error(`daily jobs failed for day ${blockDay} (will retry next block):`, err);
      }
    }
  }

  return { from, to, heightsProcessed, transfersSeen, validatorsCreated, withdrawOverridesApplied };
}
