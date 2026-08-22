import { connectMongo, disconnectMongo } from '../db/mongo';
import { syncKeybaseAvatars } from '../ingest/validators';

// Standalone entrypoint for the REAL wall-clock daily cron (set up
// externally — system cron / hosting platform scheduler, not the block
// loop). Keybase avatar freshness has nothing to do with chain sync
// progress, unlike the weekly validator-set LCD pull (jobs/dailyJobs.ts),
// so it is deliberately NOT wired into the block-loop-driven daily job.
//
// Usage: npm run sync-keybase-avatars

async function main(): Promise<void> {
  await connectMongo();
  try {
    const stats = await syncKeybaseAvatars();
    console.log(
      `keybase sync done — ${stats.identitiesChecked} identities checked, ` +
        `${stats.avatarsResolved} avatars resolved`
    );
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error('sync-keybase-avatars failed:', err);
  process.exit(1);
});
