import { getSqlite } from '../db/sqlite';
import { FundFlowEdge } from '../models/FundFlowEdge/FundFlowEdge';
import { Meta } from '../models/Meta/Meta';
import { getCursor } from '../store/meta';

// Snapshot SQLite `edges` into a new versioned Mongo `fund_flow_edges` copy
// (docs/01 "Snapshot to Mongo", docs/04 SNAPSHOT SQL). Sequence matters:
//   1. read everything from SQLite FIRST, synchronously (better-sqlite3 is
//      sync, so nothing can interleave mid-read — this alone gives us a
//      consistent point-in-time snapshot without any extra locking).
//   2. write edges with published=false (invisible to the dashboard).
//   3. flip them to published=true (the commit switch).
//   4. ONLY THEN bump meta.fund_flow_current_version — so a reader that
//      trusts the meta pointer never observes a version before its edges
//      are actually published.
// Rollback machinery (per-version snapshot_height) is deliberately deferred
// (CLAUDE.md) — this just increments `version` + flips `published`.

interface EdgeRow {
  origin: string;
  holder: string;
  weight: bigint;
  depth: bigint;
  status: string;
  sink_kind: string | null;
  weight_prefix_sum: bigint;
  first_height: bigint;
  first_ts: bigint;
  last_height: bigint;
  last_ts: bigint;
}

interface TotalsRow {
  status: string;
  total: bigint;
}

export interface FundFlowTotals {
  in_flight: string;
  realized: string;
  suspected: string;
}

export interface SnapshotStats {
  version: number;
  edgeCount: number;
  totals: FundFlowTotals;
}

function toMongoEdge(row: EdgeRow, version: number) {
  // sink_tier is NOT a SQLite column — derived from status (docs/03 note).
  const sink_tier = row.status === 'realized' ? 1 : row.status === 'suspected' ? 2 : null;
  return {
    version,
    published: false,
    origin: row.origin,
    holder: row.holder,
    depth: Number(row.depth),
    weight: row.weight.toString(),
    weight_prefix_sum: row.weight_prefix_sum.toString(),
    status: row.status,
    sink_tier,
    sink_kind: row.sink_kind,
    first_seen_height: Number(row.first_height),
    first_seen_timestamp: Number(row.first_ts),
    last_update_height: Number(row.last_height),
    last_update_timestamp: Number(row.last_ts),
  };
}

export async function snapshotFundFlowToMongo(): Promise<SnapshotStats> {
  const db = getSqlite();

  // ── 1. synchronous SQLite reads (atomic point-in-time snapshot) ──────
  const edgeRows = db
    .prepare(
      `SELECT origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
              first_height, first_ts, last_height, last_ts
       FROM edges`
    )
    .all() as EdgeRow[];

  const totalsRows = db
    .prepare('SELECT status, SUM(weight) AS total FROM edges GROUP BY status')
    .all() as TotalsRow[];

  const totals: FundFlowTotals = { in_flight: '0', realized: '0', suspected: '0' };
  for (const r of totalsRows) {
    if (r.status in totals) totals[r.status as keyof FundFlowTotals] = r.total.toString();
  }

  // ── 2. version number (next after whatever is currently published) ───
  const meta = await Meta.getSingleton();
  const version = meta.fund_flow_current_version + 1;

  // ── 3. write edges (published=false), then flip the commit switch ────
  if (edgeRows.length > 0) {
    await FundFlowEdge.insertMany(
      edgeRows.map((row) => toMongoEdge(row, version)),
      { ordered: false }
    );
    await FundFlowEdge.updateMany({ version }, { $set: { published: true } });
  }

  // ── 4. bump the pointer LAST — only now is version fully visible ─────
  const cursor = getCursor(); // SQLite is the authority; mirror it for dashboard reads
  meta.scanned_up_to_height = cursor.height;
  meta.scanned_up_to_time = cursor.ts;
  meta.fund_flow_current_version = version;
  meta.fund_flow_edge_count = edgeRows.length;
  meta.fund_flow_totals = totals;
  meta.updated_at = new Date();
  await meta.save();

  return { version, edgeCount: edgeRows.length, totals };
}
