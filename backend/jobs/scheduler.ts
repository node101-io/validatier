import { runBlockLoop } from './blockLoop';
import { snapshotFundFlowToMongo } from './snapshot';
import { runDailyValidatorStats } from './validatorStats';
import { syncPrices } from './priceSync';

// Top-level orchestration (task 10.2). Two independent timers on the SAME
// event loop — Node interleaves their awaited I/O, so a long-running daily
// sequence does NOT block the block loop's own timer from firing and
// advancing the cursor in between (snapshot.ts already reads all of SQLite
// synchronously up front for exactly this reason — see its header comment).

const BLOCK_LOOP_INTERVAL_MS = 10_000; // ~ cosmoshub block time (~6s), with margin
const DAILY_CHECK_INTERVAL_MS = 5 * 60_000; // how often we check "did a new UTC day start?"

function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

let blockLoopRunning = false;
let dailyRunning = false;
let lastDailyRunDay: string | null = null;

async function tickBlockLoop(): Promise<void> {
  if (blockLoopRunning) return; // previous tick still catching up a backlog — don't overlap
  blockLoopRunning = true;
  try {
    await runBlockLoop();
  } catch (err) {
    console.error('block loop tick failed (will retry next tick):', err);
  } finally {
    blockLoopRunning = false;
  }
}

async function tickDailyJobs(): Promise<void> {
  const today = todayUtc();
  if (dailyRunning || today === lastDailyRunDay) return;
  dailyRunning = true;
  try {
    // ORDER MATTERS (docs/01): the snapshot's height must be >= the
    // validator_stats height, so sold% (realized / withdrawn) never exceeds
    // 100% — withdrawn is read AFTER realized is already published.
    await snapshotFundFlowToMongo();
    await runDailyValidatorStats();
    await syncPrices(3); // small daily top-up; the 365-day backfill was one-time (task 9.1)
    lastDailyRunDay = today; // only mark done on full success — a failure retries same-day
  } catch (err) {
    console.error('daily jobs failed (will retry on the next check, same UTC day):', err);
  } finally {
    dailyRunning = false;
  }
}

export interface Scheduler {
  stop: () => void;
}

export function startScheduler(): Scheduler {
  const blockTimer = setInterval(() => void tickBlockLoop(), BLOCK_LOOP_INTERVAL_MS);
  const dailyTimer = setInterval(() => void tickDailyJobs(), DAILY_CHECK_INTERVAL_MS);
  void tickBlockLoop(); // don't wait a full interval for the first run
  void tickDailyJobs();

  return {
    stop: () => {
      clearInterval(blockTimer);
      clearInterval(dailyTimer);
    },
  };
}
