import { IValidatorSinkSale, ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';

// Sparse per-(validator, sink) cumulative-sold log (docs/03 validator_sink_sales).
// Written from snapshot.ts, in the same Mongo transaction as that day's
// `fund_flow_edges` snapshot — it reuses the `status='realized'` rows already
// read there rather than re-reading SQLite. Only pure/read-only helpers live
// here: a new doc is produced ONLY when a pair's cumulative_sold actually
// changed since its last stored entry; unchanged pairs produce zero writes
// (no zero-delta entries, no daily no-op rows).

export interface RealizedEdgeRow {
  origin: string;
  holder: string;
  sink_kind: 'cex' | 'dex' | 'ibc_out';
  weight_prefix_sum: bigint;
}

export interface LatestSaleKey {
  operator_address: string;
  sink_address: string;
}

// Pure — no I/O. Given the current realized edges and a map of the last stored
// cumulative_sold per (operator_address, sink_address) pair, decide which pairs
// actually changed and build the docs to insert for them. Skips any pair whose
// value is unchanged (or, for a never-seen pair, whose value is "0" — nothing to
// record yet).
export function buildValidatorSinkSaleDocs(
  edges: RealizedEdgeRow[],
  lastCumulativeByPair: Map<string, string>,
  stamp: { block_height: number; timestamp: number; day: number; month: number; year: number }
): Array<Omit<IValidatorSinkSale, '_id'>> {
  const docs: Array<Omit<IValidatorSinkSale, '_id'>> = [];

  for (const edge of edges) {
    const cumulative_sold = edge.weight_prefix_sum.toString();
    const key = pairKey(edge.origin, edge.holder);
    const previous = lastCumulativeByPair.get(key);

    if (previous === cumulative_sold) continue; // unchanged -> no write
    if (previous === undefined && cumulative_sold === '0') continue; // nothing to record yet

    docs.push({
      operator_address: edge.origin,
      sink_address: edge.holder,
      sink_kind: edge.sink_kind,
      cumulative_sold,
      block_height: stamp.block_height,
      timestamp: stamp.timestamp,
      day: stamp.day,
      month: stamp.month,
      year: stamp.year,
    });
  }

  return docs;
}

export function pairKey(operator_address: string, sink_address: string): string {
  return `${operator_address} ${sink_address}`;
}

export async function readLastCumulativeByPair(): Promise<Map<string, string>> {
  const latest = await ValidatorSinkSale.aggregate<{
    _id: { operator_address: string; sink_address: string };
    cumulative_sold: string;
  }>([
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: { operator_address: '$operator_address', sink_address: '$sink_address' },
        cumulative_sold: { $first: '$cumulative_sold' },
      },
    },
  ]);

  const map = new Map<string, string>();
  for (const row of latest) {
    map.set(pairKey(row._id.operator_address, row._id.sink_address), row.cumulative_sold);
  }
  return map;
}
