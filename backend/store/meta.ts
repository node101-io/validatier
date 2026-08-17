import type { Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';

// SQLite `meta` primitives: the block-scan cursor (docs/04 `meta` — single
// row, id=1, guaranteed to exist by the schema init).

export interface Cursor {
  height: number;
  ts: number;
}

let getStmt: Statement | null = null;
let setStmt: Statement | null = null;

export function getCursor(): Cursor {
  if (!getStmt) {
    getStmt = getSqlite().prepare(
      'SELECT scanned_up_to_height, scanned_up_to_ts FROM meta WHERE id = 1'
    );
  }
  const row = getStmt.get() as { scanned_up_to_height: bigint; scanned_up_to_ts: bigint };
  return { height: Number(row.scanned_up_to_height), ts: Number(row.scanned_up_to_ts) };
}

// Called from WITHIN the per-height transaction (jobs/blockLoop.ts) — the
// cursor only moves together with that height's fully-applied transfers.
export function advanceCursor(height: number, ts: number): void {
  if (!setStmt) {
    setStmt = getSqlite().prepare(
      'UPDATE meta SET scanned_up_to_height = ?, scanned_up_to_ts = ?, updated_at = unixepoch() WHERE id = 1'
    );
  }
  setStmt.run(height, ts);
}

// Persisted "did the daily job already run for this day" marker
// (jobs/blockLoop.ts / jobs/dailyJobs.ts). The day string is derived from
// the PROCESSED BLOCK's timestamp, not wall-clock time — see
// jobs/blockLoop.ts's utcDayFromTs(). Kept in SQLite, not a process-local
// variable — otherwise a restart mid-day (common during dev, or any
// crash/redeploy) forgets the day already ran and re-triggers the full
// validator_stats pass (625 validators x 2 LCD calls) again for no reason.
let getDailyRunStmt: Statement | null = null;
let setDailyRunStmt: Statement | null = null;

export function getLastDailyRunDay(): string | null {
  if (!getDailyRunStmt) {
    getDailyRunStmt = getSqlite().prepare('SELECT last_daily_run_day FROM meta WHERE id = 1');
  }
  const row = getDailyRunStmt.get() as { last_daily_run_day: string | null };
  return row.last_daily_run_day;
}

export function setLastDailyRunDay(day: string): void {
  if (!setDailyRunStmt) {
    setDailyRunStmt = getSqlite().prepare(
      'UPDATE meta SET last_daily_run_day = ?, updated_at = unixepoch() WHERE id = 1'
    );
  }
  setDailyRunStmt.run(day);
}
