import { getSqlite } from '../db/sqlite';
import { Meta } from '../models/Meta/Meta';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { getCursor } from '../store/meta';
import { buildValidatorSinkSaleDocs, readLastCumulativeByPair, RealizedEdgeRow } from './validatorSinkSales';

// Reads SQLite `edges` and appends any `validator_sink_sales` rows for
// edges that reached a sink (docs/01 "Snapshot to Mongo", docs/03
// validator_sink_sales, docs/04 SNAPSHOT SQL).
//
// Used to ALSO write a full versioned copy of every edge into a Mongo
// `fund_flow_edges` collection, every single day, forever (no pruning) —
// removed 2026-09-23: confirmed nothing reads that collection (the API only
// reads `meta.fund_flow_current_version`, a number; the dashboard's actual
// fund-flow data comes from `validator_sink_sales`, written below, which is
// already sparse/delta-only). 578 days of full daily copies had reached
// 8.2M documents for zero consumers. `meta.fund_flow_current_version` stays
// as a harmless monotonic counter (still exposed in the API type, unused by
// the frontend) — only the wasteful full-copy write is gone. See
// scripts/pruneFundFlowEdges.ts for the one-time cleanup of what already
// accumulated.

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

  // ── 4. write the sink-sale deltas ─────────────────────────────────────
  if (sinkSaleDocs.length > 0) {
    await ValidatorSinkSale.insertMany(sinkSaleDocs, { ordered: false });
  }

  // ── 5. bump the pointer ────────────────────────────────────────────────
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
