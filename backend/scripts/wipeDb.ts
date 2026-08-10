import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import { config } from '../config';

// Wipes BOTH stores for a clean restart: all Mongo collections (dropped, not
// just emptied — so indexes get rebuilt fresh by mongoose on next app start)
// and the SQLite working-store file (+ WAL/SHM siblings — leaving those behind
// while deleting only the main file risks stale-WAL weirdness on next open).
// Run manually, only when you actually want to lose all indexed/scanned state
// (e.g. after a schema change or a corrupt backfill) — the app must be
// STOPPED first, otherwise a live process's open SQLite handle keeps writing
// to the deleted-but-still-open inode and "reset" silently no-ops for it.
//
// Usage: npm run wipe-db -- --yes

function resolveSqlitePath(): string {
  const p = config.sqlitePath;
  return path.isAbsolute(p) ? p : path.resolve(__dirname, '..', '..', p);
}

async function dropMongo(): Promise<void> {
  const client = new MongoClient(config.mongoUri);
  await client.connect();
  const db = client.db();
  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    await db.collection(name).drop();
    console.log(`mongo: dropped ${name}`);
  }
  await client.close();
}

function deleteSqlite(): void {
  const dbPath = resolveSqlitePath();
  for (const suffix of ['', '-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`sqlite: deleted ${p}`);
    } else {
      console.log(`sqlite: ${p} not present, skipped`);
    }
  }
}

async function main(): Promise<void> {
  if (!process.argv.includes('--yes')) {
    console.error(
      'refusing to run without --yes — this permanently drops every Mongo ' +
        'collection and deletes the SQLite working store. Stop the app first, ' +
        'then: npm run wipe-db -- --yes'
    );
    process.exit(1);
  }

  console.log(`mongo: ${config.mongoUri}`);
  console.log(`sqlite: ${resolveSqlitePath()}`);

  await dropMongo();
  deleteSqlite();

  console.log('wipe done — start the app fresh now');
}

main().catch((err) => {
  console.error('wipe-db failed:', err);
  process.exit(1);
});
