import type { TimedValue } from './lookup';

// Mirrors the fields of Mongo `validator_sink_sales` docs (docs/03) actually
// needed here — sink_kind/block_height/day/month/year are irrelevant to export.
export interface SinkSaleDoc {
  sink_address: string;
  cumulative_sold: string; // uatom BigInt-string, monotonic per (operator, sink)
  timestamp: number;
}

// All_time sold total for one validator: Σ latest cumulative_sold across every
// distinct sink it has ever sold to (docs/03 "Interval query" note — total at
// time t = Σ over pairs of valueAt(pair, t); all_time = t -> +inf).
export function latestCumulativeByPair(sales: ReadonlyArray<SinkSaleDoc>): bigint {
  const latestBySink = new Map<string, { timestamp: number; value: bigint }>();
  for (const doc of sales) {
    const existing = latestBySink.get(doc.sink_address);
    if (!existing || doc.timestamp > existing.timestamp) {
      latestBySink.set(doc.sink_address, { timestamp: doc.timestamp, value: BigInt(doc.cumulative_sold) });
    }
  }
  let total = 0n;
  for (const entry of latestBySink.values()) total += entry.value;
  return total;
}

// Merges every sink's own (sparse, per-pair) cumulative_sold event stream into
// a single "total sold across all sinks, as of any timestamp" timeline for one
// validator — the input `lookup.valueAtOrBefore` needs to answer "how much had
// this validator sold by day D" when building its monthly buckets.
export function buildCumulativeSoldTimeline(sales: ReadonlyArray<SinkSaleDoc>): Array<TimedValue<bigint>> {
  const events = [...sales].sort((a, b) => a.timestamp - b.timestamp);
  const bySink = new Map<string, bigint>();
  const timeline: Array<TimedValue<bigint>> = [];

  let i = 0;
  while (i < events.length) {
    const ts = events[i]!.timestamp;
    while (i < events.length && events[i]!.timestamp === ts) {
      bySink.set(events[i]!.sink_address, BigInt(events[i]!.cumulative_sold));
      i++;
    }
    let total = 0n;
    for (const value of bySink.values()) total += value;
    timeline.push({ timestamp: ts, value: total });
  }

  return timeline;
}
