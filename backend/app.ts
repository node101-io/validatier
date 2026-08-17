import { config } from './config';
import { connectMongo, disconnectMongo } from './db/mongo';
import { closeSqlite, openSqlite } from './db/sqlite';
import { syncValidatorsFromChain } from './ingest/validators';
import { buildWithdrawMap } from './ingest/withdrawMap';
import { syncSinkRegistryFromCsv } from './ingest/sinkRegistry';
import { startScheduler, type Scheduler } from './jobs/scheduler';

async function main(): Promise<void> {
  // No secrets in logs (MONGO_URI stays out).
  console.log(
    `validatier backend: config OK — denom=${config.denom}, decimals=${config.decimals}, ` +
      `max_depth=${config.maxDepth}, tier2_min_indegree=${config.tier2MinIndegree}`
  );

  await connectMongo();
  openSqlite();

  // Register shutdown BEFORE the slow priming calls below, so Ctrl-C works
  // cleanly even while still starting up.
  let scheduler: Scheduler | null = null;
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received, shutting down`);
    await scheduler?.stop();
    await disconnectMongo();
    closeSqlite();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Prime reference data (idempotent — safe on every restart, essential on a
  // cold/empty database): validators + withdraw_map (tasks 5.1/5.2), Tier 1
  // sink list (task 6.4's "load at startup" requirement, never actually
  // wired in until now).
  console.log('priming: validators...');
  const vStats = await syncValidatorsFromChain();
  console.log(`priming: ${vStats} validators synced`);

  console.log('priming: withdraw_map...');
  const wStats = await buildWithdrawMap();
  console.log(`priming: withdraw_map built (${wStats.validators} validators, ${wStats.overrides} overrides)`);

  console.log('priming: sink registry...');
  const sStats = await syncSinkRegistryFromCsv();
  console.log(`priming: ${sStats.total} sink addresses loaded`);

  scheduler = startScheduler();
  console.log('scheduler started: block loop + daily jobs running');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
