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
