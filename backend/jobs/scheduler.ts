import { runBlockLoop } from './blockLoop';
import { snapshotFundFlowToMongo } from './snapshot';
import { runDailyValidatorStats } from './validatorStats';
import { runDailyValidatorSinkSales } from './validatorSinkSales';
import { syncPrices } from './priceSync';
import { getLastDailyRunDay, setLastDailyRunDay } from '../store/meta';

// Top-level orchestration (task 10.2). Two independent timers on the SAME
// event loop — Node interleaves their awaited I/O, so a long-running daily
// sequence does NOT block the block loop's own timer from firing and
// advancing the cursor in between (snapshot.ts already reads all of SQLite
// synchronously up front for exactly this reason — see its header comment).

const BLOCK_LOOP_INTERVAL_MS = 10_000; // ~ cosmoshub block time (~6s), with margin
const DAILY_CHECK_INTERVAL_MS = 5 * 60_000; // how often we check "did a new UTC day start?"
// Stagger the first-run daily kickoff so it doesn't hit the RPC/LCD endpoint
// in the same instant as the first block-loop tick right after startup —
// both go to the same host (see .env), no reason to burst them together.
const DAILY_FIRST_RUN_DELAY_MS = 30_000;

function todayUtc(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

let blockLoopRunning = false;
let dailyRunning = false;

async function tickBlockLoop(): Promise<void> {
  if (blockLoopRunning) return; // previous tick still catching up a backlog — don't overlap
  blockLoopRunning = true;
  try {
    const stats = await runBlockLoop();
    if (stats.heightsProcessed > 0) {
      console.log(
        `block loop: heights ${stats.from}-${stats.to} (${stats.heightsProcessed} processed), ` +
          `${stats.transfersSeen} transfers, ${stats.validatorsCreated} validators created, ` +
          `${stats.withdrawOverridesApplied} withdraw overrides`
      );
    }
  } catch (err) {
    console.error('block loop tick failed (will retry next tick):', err);
  } finally {
    blockLoopRunning = false;
  }
}

async function tickDailyJobs(): Promise<void> {
  const today = todayUtc();
  if (dailyRunning || today === getLastDailyRunDay()) return;
  dailyRunning = true;
  console.log(`daily jobs: starting for UTC day ${today}`);
  try {
    // ORDER MATTERS (docs/01): the snapshot's height must be >= the
    // validator_stats height, so sold% (realized / withdrawn) never exceeds
    // 100% — withdrawn is read AFTER realized is already published.
    const snap = await snapshotFundFlowToMongo();
    console.log('daily jobs: fund-flow snapshot done', snap);
    const sinkSales = await runDailyValidatorSinkSales();
    console.log(
      `daily jobs: validator_sink_sales done — height=${sinkSales.height} ` +
        `checked=${sinkSales.checked} written=${sinkSales.written}`
    );
    const vstats = await runDailyValidatorStats();
    console.log(
      `daily jobs: validator_stats done — height=${vstats.height} attempted=${vstats.attempted} ` +
        `succeeded=${vstats.succeeded} skipped=${vstats.skipped.length}`
    );
    await syncPrices(3); // small daily top-up; the 365-day backfill was one-time (task 9.1)
    console.log('daily jobs: price sync done');
    setLastDailyRunDay(today); // only mark done on full success — a failure retries same-day
    console.log(`daily jobs: all done for UTC day ${today}`);
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
  const firstDailyTimeout = setTimeout(() => void tickDailyJobs(), DAILY_FIRST_RUN_DELAY_MS);

  return {
    stop: () => {
      clearInterval(blockTimer);
      clearInterval(dailyTimer);
      clearTimeout(firstDailyTimeout);
    },
  };
}
