import { config } from './config';
import { connectMongo, disconnectMongo } from './db/mongo';
import { closeSqlite, openSqlite } from './db/sqlite';

// Entrypoint. Wiring (SQLite -> block loop -> schedulers) is added task by task.
async function main(): Promise<void> {
  // No secrets in logs (MONGO_URI stays out).
  console.log(
    `validatier backend: config OK — denom=${config.denom}, decimals=${config.decimals}, ` +
      `max_depth=${config.maxDepth}, tier2_min_indegree=${config.tier2MinIndegree}`
  );

  await connectMongo();
  openSqlite();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received, shutting down`);
    await disconnectMongo();
    closeSqlite();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
