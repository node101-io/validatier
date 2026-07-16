import type { Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';

// Edge-table primitives (docs/04 hot-path).

let taintStmt: Statement | null = null;

// O(1)-ish via the partial index idx_edges_holder: the WHERE clause matches the
// index definition (status != 'realized') exactly, so realized edges — terminal
// sinks — are invisible here by construction. Never hand-maintain a reverse index.
export function isTainted(address: string): boolean {
  if (!taintStmt) {
    taintStmt = getSqlite().prepare(
      "SELECT 1 FROM edges WHERE holder = ? AND status != 'realized' LIMIT 1"
    );
  }
  return taintStmt.get(address) !== undefined;
}
