import { snapshotFundFlowToMongo } from './snapshot';
import { runDailyValidatorStats } from './validatorStats';
import { syncPrices } from './priceSync';
import { getCursor, setLastDailyRunDay } from '../store/meta';

// The once-per-block-day sequence, extracted so blockLoop.ts can call it
// inline without importing scheduler.ts (which imports blockLoop.ts —
// runBlockLoop() — and would otherwise create a circular import).
//
// ORDER MATTERS (docs/01): the snapshot's height must be >= the
// validator_stats height, so sold% (realized / withdrawn) never exceeds
// 100% — withdrawn is read AFTER realized is already published. The
// snapshot itself writes fund_flow_edges AND validator_sink_sales
// atomically in one Mongo transaction (snapshot.ts).
//
// `day` is the caller's block-timestamp-derived day string (blockLoop.ts),
// NOT wall-clock — the marker only advances once all three steps succeed,
// so a thrown error here leaves it unset and the caller retries on the
// next block still on this same chain-day.
export async function runDailyJobsForDay(day: string): Promise<void> {
  console.log(`daily jobs: starting for day ${day}`);
  const snap = await snapshotFundFlowToMongo();
  console.log(
    `daily jobs: fund-flow snapshot done — version=${snap.version} edges=${snap.edgeCount} ` +
      `sinkSalesChecked=${snap.sinkSalesChecked} sinkSalesWritten=${snap.sinkSalesWritten}`
  );
  // Height must be the cursor's (the block that actually triggered this day's
  // job), NOT the live chain tip — during backfill catch-up the block loop can
  // be processing a day far behind the tip, and validatorStats.ts's tip-default
  // only makes sense for the old wall-clock-cron design (see its own comment).
  // Passing the wrong height here silently wrote every backfilled day's stats
  // into TODAY's slot instead (tip's timestamp is always "now").
  const vstats = await runDailyValidatorStats(getCursor().height);
  console.log(
    `daily jobs: validator_stats done — height=${vstats.height} attempted=${vstats.attempted} ` +
      `succeeded=${vstats.succeeded} skipped=${vstats.skipped.length}`
  );
  await syncPrices(3); // small daily top-up; the 365-day backfill was one-time (task 9.1)
  console.log('daily jobs: price sync done');
  setLastDailyRunDay(day); // only mark done on full success — a failure retries same day
  console.log(`daily jobs: all done for day ${day}`);
}
