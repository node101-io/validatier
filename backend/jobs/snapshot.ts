import mongoose from 'mongoose';
import { getSqlite } from '../db/sqlite';
import { FundFlowEdge } from '../models/FundFlowEdge/FundFlowEdge';
import { Meta } from '../models/Meta/Meta';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { getCursor } from '../store/meta';
import { buildValidatorSinkSaleDocs, readLastCumulativeByPair, RealizedEdgeRow } from './validatorSinkSales';

// Snapshot SQLite `edges` into a new versioned Mongo `fund_flow_edges` copy,
// and — in the SAME Mongo transaction — append any `validator_sink_sales`
// rows for edges that reached a sink (docs/01 "Snapshot to Mongo", docs/03
// validator_sink_sales, docs/04 SNAPSHOT SQL). The two collections must never
// drift apart: either both this version's edges AND its sink-sale deltas land,
// or neither does. Sequence:
//   1. read everything from SQLite FIRST, synchronously (better-sqlite3 is
//      sync, so nothing can interleave mid-read — this alone gives us a
//      consistent point-in-time snapshot without any extra locking).
//   2. inside one Mongo transaction: write edges (published=false), flip them
//      to published=true (the commit switch), and insert the sink-sale deltas.
//   3. ONLY once that transaction commits, bump meta.fund_flow_current_version
//      — so a reader that trusts the meta pointer never observes a version
//      before its edges are actually published.
// Rollback machinery (per-version snapshot_height) is deliberately deferred
// (CLAUDE.md) — this just increments `version` + flips `published`.
//
// Mongo transactions require the target deployment to be a replica set
// (Atlas — the prod .env target — always is; a local standalone `mongod`
// is not, and needs `--replSet` + a one-time `rs.initiate()` to support this).

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
  sinkSalesChecked: number;
  sinkSalesWritten: number;
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

  const cursor = getCursor(); // SQLite is the authority; mirror it for dashboard reads + sink-sale stamp

  // ── 2. version number (next after whatever is currently published) ───
  const meta = await Meta.getSingleton();
  const version = meta.fund_flow_current_version + 1;

  // ── 3. read-only sink-sales prep (which realized edges changed since
  //      their last stored cumulative_sold) — no SQLite re-read needed,
  //      `edgeRows` already has everything `status='realized'` implies. ──
  const realizedEdges: RealizedEdgeRow[] = edgeRows
    .filter((row) => row.status === 'realized')
    .map((row) => ({
      origin: row.origin,
      holder: row.holder,
      sink_kind: row.sink_kind as 'cex' | 'dex' | 'ibc_out',
      weight_prefix_sum: row.weight_prefix_sum,
    }));
  const lastCumulativeByPair = await readLastCumulativeByPair();
  const d = new Date(cursor.ts * 1000);
  const stamp = {
    block_height: cursor.height,
    timestamp: cursor.ts,
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    year: d.getUTCFullYear(),
  };
  const sinkSaleDocs = buildValidatorSinkSaleDocs(realizedEdges, lastCumulativeByPair, stamp);

  // ── 4. one transaction: edges (published=false -> true) + sink-sales ─
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (edgeRows.length > 0) {
        await FundFlowEdge.insertMany(
          edgeRows.map((row) => toMongoEdge(row, version)),
          { session, ordered: false }
        );
        await FundFlowEdge.updateMany({ version }, { $set: { published: true } }, { session });
      }
      if (sinkSaleDocs.length > 0) {
        await ValidatorSinkSale.insertMany(sinkSaleDocs, { session, ordered: false });
      }
    });
  } finally {
    await session.endSession();
  }

  // ── 5. bump the pointer LAST — only now is version fully visible ─────
  meta.scanned_up_to_height = cursor.height;
  meta.scanned_up_to_time = cursor.ts;
  meta.fund_flow_current_version = version;
  meta.fund_flow_edge_count = edgeRows.length;
  meta.fund_flow_totals = totals;
  meta.updated_at = new Date();
  await meta.save();

  return {
    version,
    edgeCount: edgeRows.length,
    totals,
    sinkSalesChecked: realizedEdges.length,
    sinkSalesWritten: sinkSaleDocs.length,
  };
}
