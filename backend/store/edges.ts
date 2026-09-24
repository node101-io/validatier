import type { Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';

// Edge-table primitives (docs/04 hot-path).

let taintStmt: Statement | null = null;
let inDegreeStmt: Statement | null = null;
let markStatusStmt: Statement | null = null;

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

// Tier 2 signal (docs/01): how many DISTINCT origins have ever sent money to
// this holder. Deliberately NOT filtered by status — a realized address that
// also pooled money from many origins is still evidence of a market pattern.
export function inDegreeOf(holder: string): number {
  if (!inDegreeStmt) {
    inDegreeStmt = getSqlite().prepare(
      'SELECT COUNT(DISTINCT origin) AS indeg FROM edges WHERE holder = ?'
    );
  }
  const row = inDegreeStmt.get(holder) as { indeg: bigint | number };
  return Number(row.indeg);
}

// Classification (docs/04 CLASSIFY): flip every non-realized edge at `holder`
// to the given status/sink_kind. Realized is terminal — WHERE excludes it so a
// sink can never be "un-realized" by a later, weaker signal (e.g. a stale
// suspected re-check running after the address already hit the static list).
// (sink_tier is NOT a SQLite column — it's derived from `status` at Mongo
// snapshot time: realized -> 1, suspected -> 2, in_flight -> null.)
//
// Also bumps last_height/last_ts to the CURRENT height — found missing
// 2026-09-23 while building a delta-based Mongo snapshot (jobs/snapshot.ts):
// this UPDATE flips ALL of a holder's non-realized edges at once (every
// origin commingled there), but only the origin whose transfer just
// triggered contraction had its edge's last_height bumped (by
// contraction.ts's upsertReceiver, for that hop only) — every OTHER
// origin's edge at the same holder had its status/sink_kind change silently
// with a stale last_height. A delta snapshot filtering on "changed since
// last_height > X" would miss those origins' status flips entirely. Since
// last_update_height/last_update_timestamp are the documented "this edge
// last changed" fields (docs/03), any write path that changes a row must
// bump them — this was the one that didn't.
export function markHolderStatus(
  holder: string,
  status: 'realized' | 'suspected',
  sinkKind: string,
  height: number,
  ts: number
): void {
  if (!markStatusStmt) {
    markStatusStmt = getSqlite().prepare(`
      UPDATE edges SET status = @status, sink_kind = @sinkKind, last_height = @height, last_ts = @ts
      WHERE holder = @holder AND status != 'realized'`);
  }
  markStatusStmt.run({ holder, status, sinkKind, height, ts });
}
