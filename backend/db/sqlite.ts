import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config';

// DDL is copied verbatim from docs/04-sqlite-working-store.md (only IF NOT EXISTS
// added so init is idempotent). Do not add/rename fields here without updating the doc.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS edges (
  origin            TEXT    NOT NULL,
  holder            TEXT    NOT NULL,
  weight            INTEGER NOT NULL,
  depth             INTEGER NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'in_flight',
  sink_kind         TEXT,
  weight_prefix_sum INTEGER NOT NULL DEFAULT 0,
  first_height      INTEGER NOT NULL,
  first_ts          INTEGER NOT NULL,
  last_height       INTEGER NOT NULL,
  last_ts           INTEGER NOT NULL,
  PRIMARY KEY (origin, holder)
) WITHOUT ROWID;

-- Reverse lookup (taint check / haircut / in-degree). Partial: realized edges drop
-- out automatically, so a realized holder is never found as a tainted sender again.
CREATE INDEX IF NOT EXISTS idx_edges_holder ON edges(holder) WHERE status != 'realized';

CREATE INDEX IF NOT EXISTS idx_edges_status ON edges(status);

CREATE TABLE IF NOT EXISTS seed (
  origin               TEXT PRIMARY KEY,
  reward_withdrawn     INTEGER NOT NULL DEFAULT 0,
  commission_withdrawn INTEGER NOT NULL DEFAULT 0,
  last_height          INTEGER NOT NULL,
  last_ts              INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS withdraw_map (
  withdraw_address TEXT NOT NULL,
  operator_address TEXT NOT NULL,
  PRIMARY KEY (withdraw_address, operator_address)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_wmap_operator ON withdraw_map(operator_address);

CREATE TABLE IF NOT EXISTS validator_state (
  epoch        INTEGER NOT NULL,
  operator     TEXT    NOT NULL,
  total_stake  INTEGER NOT NULL,
  block_height INTEGER NOT NULL,
  ts           INTEGER NOT NULL,
  PRIMARY KEY (epoch, operator)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS sink_registry (
  address TEXT PRIMARY KEY,
  tier    INTEGER NOT NULL,
  kind    TEXT    NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS meta (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  scanned_up_to_height INTEGER NOT NULL DEFAULT 0,
  scanned_up_to_ts     INTEGER NOT NULL DEFAULT 0,
  fund_flow_version    INTEGER NOT NULL DEFAULT 0,
  last_daily_run_day   TEXT,
  last_validator_sync_ts INTEGER,
  updated_at           INTEGER NOT NULL
);

-- meta is single-row by design; guarantee the row now so later tasks (cursor
-- read/update) never deal with "row missing".
INSERT OR IGNORE INTO meta (id, updated_at) VALUES (1, unixepoch());
`;

// last_daily_run_day was added after the initial meta table shipped — on a
// DB created before this change, CREATE TABLE IF NOT EXISTS above is a no-op
// and the column is missing. ALTER TABLE has no "IF NOT EXISTS" for columns,
// so make it idempotent by hand.
function migrateAddLastDailyRunDay(database: Database.Database): void {
  try {
    database.exec('ALTER TABLE meta ADD COLUMN last_daily_run_day TEXT');
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('duplicate column name')) throw err;
  }
}

// same idempotent-ALTER pattern as migrateAddLastDailyRunDay — added after
// the initial meta table shipped, so older DBs need the column bolted on.
// Tracks the CHAIN time (cursor.ts, not wall-clock) of the last weekly
// validator-set LCD sync — see jobs/dailyJobs.ts.
function migrateAddLastValidatorSyncTs(database: Database.Database): void {
  try {
    database.exec('ALTER TABLE meta ADD COLUMN last_validator_sync_ts INTEGER');
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('duplicate column name')) throw err;
  }
}

let db: Database.Database | null = null;

function resolveDbPath(): string {
  // Relative SQLITE_PATH is resolved against the package root (same rule as .env
  // in config.ts) — cwd-independent. __dirname is dist/db/ after compilation.
  const p = config.sqlitePath;
  return path.isAbsolute(p) ? p : path.resolve(__dirname, '..', '..', p);
}

export function openSqlite(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = OFF');
  db.defaultSafeIntegers(true); // INTEGER -> BigInt everywhere; uatom never touches float64

  db.exec(SCHEMA);
  migrateAddLastDailyRunDay(db);
  migrateAddLastValidatorSyncTs(db);

  console.log(`sqlite: opened ${dbPath} (WAL, BigInt mode)`);
  return db;
}

export function getSqlite(): Database.Database {
  if (!db) throw new Error('sqlite: not opened yet — call openSqlite() first');
  return db;
}

export function closeSqlite(): void {
  if (!db) return;
  db.close(); // flushes WAL checkpoint
  db = null;
  console.log('sqlite: closed');
}
