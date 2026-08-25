import { config } from '../config';
import { Validator } from '../models/Validator/Validator';
import { ValidatorStats } from '../models/ValidatorStats/ValidatorStats';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { FundFlowSinkRegistry } from '../models/FundFlowSinkRegistry/FundFlowSinkRegistry';
import { Price } from '../models/Price/Price';
import { Meta } from '../models/Meta/Meta';
import { memoizeWithTtl } from './cache';
import { buildCumulativeSoldTimeline } from './lib/sinkSales';
import type { SinkSaleDoc } from './lib/sinkSales';
import { buildSinkBreakdown } from './lib/sinkBreakdown';
import { buildMonthlyBucket } from './lib/statsSeries';
import type { MonthlyBucket, ValidatorStatsMonthDoc } from './lib/statsSeries';
import {
  buildMetrics,
  buildNetworkMonthlyBuckets,
  buildSummaryData,
  buildValidatorRow,
  rankByPercentageSold,
} from './lib/aggregate';
import type { ValidatorIdentity, ValidatorRow } from './lib/aggregate';
import type { TimedValue } from './lib/lookup';
import type { ResolvedRange } from './lib/dateRange';
import type { DashboardSnapshot, ValidatorSummaryJson } from './types';

// This is the ONLY place that turns the live Mongo collections into the
// shapes server.ts serves over HTTP. All the actual math lives in
// api/lib/* (pure, unit-tested); this file is Mongo I/O + wiring — the
// export/exportJson.ts equivalent from the (now removed) static-JSON build,
// just serving requests instead of writing files.
//
// Split in two so the (expensive, range-independent) Mongo round-trip stays
// on one 60s-TTL zero-arg cache while the (cheap, in-memory) range-aware
// aggregation runs fresh per request — every route already loads every doc
// into memory today, so filtering happens in JS, not in the Mongo query.

function groupBy<T, TKey>(items: T[], key: (item: T) => TKey): Map<TKey, T[]> {
  const groups = new Map<TKey, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

async function fetchRawSnapshot() {
  const [validators, statsDocsRaw, sinkSalesRaw, sinkRegistryDocs, priceDocs, meta] = await Promise.all([
    Validator.find({}).lean(),
    ValidatorStats.find({}).lean(),
    ValidatorSinkSale.find({}).lean(),
    FundFlowSinkRegistry.find({}).lean(),
    Price.find({}).sort({ timestamp: 1 }).lean(),
    Meta.getSingleton(),
  ]);

  const statsDocs = statsDocsRaw as unknown as Array<ValidatorStatsMonthDoc & { operator_address: string }>;
  const sinkSales = sinkSalesRaw as unknown as Array<SinkSaleDoc & { operator_address: string }>;
  const labelByAddress = new Map(sinkRegistryDocs.map((d) => [d.address, d.label ?? null]));

  return { validators, statsDocs, sinkSales, labelByAddress, priceDocs, meta };
}

// 60s TTL: validator_stats/validator_sink_sales/prices only change via the
// once-a-day backend job, so this just bounds how stale a running server can
// get after a write — not a correctness requirement. This cache is
// range-independent (every route loads the same unfiltered docs), so it
// stays a single zero-arg slot even though the aggregation below now takes a
// range — no per-range cache key needed.
const loadRawSnapshot = memoizeWithTtl(fetchRawSnapshot, 60_000);

// meta only needs the Meta singleton + the latest price — neither depends
// on `range` nor on the per-validator aggregation below (buildValidatorRow/
// buildSinkBreakdown/buildMonthlyBucket over every validator). Split out so
// GET /api/meta (server.ts) doesn't pay for work it never uses.
function buildMeta(raw: Awaited<ReturnType<typeof fetchRawSnapshot>>): DashboardSnapshot['meta'] {
  const { priceDocs, meta } = raw;
  const latestPrice = priceDocs.length > 0 ? priceDocs[priceDocs.length - 1]!.price : 0;
  return {
    generated_at: Math.floor(Date.now() / 1000),
    scanned_up_to_height: meta.scanned_up_to_height,
    fund_flow_version: meta.fund_flow_current_version,
    price: latestPrice,
  };
}

export async function loadMeta(): Promise<DashboardSnapshot['meta']> {
  return buildMeta(await loadRawSnapshot());
}

function computeDashboardForRange(
  raw: Awaited<ReturnType<typeof fetchRawSnapshot>>,
  range: ResolvedRange,
): DashboardSnapshot {
  const decimals = config.decimals;
  const { validators, statsDocs, sinkSales, labelByAddress, priceDocs } = raw;

  const statsByOperator = groupBy(statsDocs, (d) => d.operator_address);
  const sinkSalesByOperator = groupBy(sinkSales, (d) => d.operator_address);

  const priceTimeline: TimedValue<number>[] = priceDocs.map((p) => ({ timestamp: p.timestamp, value: p.price }));
  const pricesInRange = priceDocs.filter((p) => p.timestamp >= range.from && p.timestamp <= range.to);
  const averagePrice =
    pricesInRange.length > 0 ? pricesInRange.reduce((sum, p) => sum + p.price, 0) / pricesInRange.length : 0;

  const rows: ValidatorRow[] = [];
  const bucketsByOperator = new Map<string, MonthlyBucket[]>();
  const breakdownByOperator = new Map<string, ReturnType<typeof buildSinkBreakdown>>();

  for (const validator of validators) {
    const identity: ValidatorIdentity = {
      operator_address: validator.operator_address,
      moniker: validator.moniker,
      temporary_image_uri: validator.temporary_image_uri,
      website: validator.website,
      commission_rate: validator.commission_rate,
    };

    const ownStats = statsByOperator.get(validator.operator_address) ?? [];
    const ownSales = sinkSalesByOperator.get(validator.operator_address) ?? [];

    // Computed once and reused below for both the row's leading_exchange and
    // ValidatorSummaryJson.sinkBreakdown — same breakdown, two call sites.
    const ownBreakdown = buildSinkBreakdown(ownSales, labelByAddress, decimals, range);
    const leadingExchange = ownBreakdown[0]?.name ?? null;

    const row = buildValidatorRow(identity, ownStats, ownSales, decimals, range, leadingExchange);
    if (!row) continue;

    const cumulativeSoldTimeline = buildCumulativeSoldTimeline(ownSales);
    const buckets = ownStats
      .map((doc) => buildMonthlyBucket(doc, decimals, cumulativeSoldTimeline, priceTimeline, range))
      .sort((a, b) => a.year - b.year || a.month - b.month);

    rows.push(row);
    bucketsByOperator.set(validator.operator_address, buckets);
    breakdownByOperator.set(validator.operator_address, ownBreakdown);
  }

  const ranks = rankByPercentageSold(rows);
  const summaryData = buildSummaryData(rows);
  const metrics = buildMetrics(summaryData, averagePrice);
  const networkBuckets = buildNetworkMonthlyBuckets([...bucketsByOperator.values()], priceTimeline);
  // Network-wide breakdown runs over every sink sale directly (not a sum of
  // the per-validator breakdowns below): buildSinkBreakdown's "latest per
  // pair" rule must see the whole set, and summing per-validator results
  // would silently drop validators filtered out of `rows` by total_withdraw > 0.
  const sinkBreakdown = buildSinkBreakdown(sinkSales, labelByAddress, decimals, range);

  const validatorByOperator = new Map(validators.map((v) => [v.operator_address, v]));
  const summaryByOperator = new Map<string, ValidatorSummaryJson>();

  for (const row of rows) {
    const validator = validatorByOperator.get(row.operator_address)!;
    // Per-validator metrics — NOT the network-wide `metrics` above. A
    // validator's own detail page must show its own average stake / sold,
    // not the sum across every validator.
    const validatorMetrics = buildMetrics(
      {
        total_stake_sum: row.average_total_stake,
        total_withdraw_sum: row.total_withdraw,
        total_sold: row.sold,
        percentage_sold: row.percentage_sold,
      },
      averagePrice
    );
    summaryByOperator.set(row.operator_address, {
      validator: {
        ...row,
        description: validator.description ?? null,
        security_contact: validator.security_contact ?? null,
        delegator_address: validator.delegator_address ?? null,
        commission_rate: validator.commission_rate ?? '0',
      },
      metrics: validatorMetrics,
      ranks: {
        percentageSoldRank: ranks.get(row.operator_address) ?? rows.length,
        totalValidators: rows.length,
      },
      sinkBreakdown: breakdownByOperator.get(row.operator_address) ?? [],
    });
  }

  return {
    meta: buildMeta(raw),
    summary: {
      summaryData,
      metrics,
      stats: networkBuckets,
      sinkBreakdown,
    },
    validators: rows,
    summaryByOperator,
    seriesByOperator: bucketsByOperator,
  };
}

// In-flight coalescing, keyed by the resolved range: a page load fires
// several requests for the SAME range concurrently (index.tsx's
// getSummary+getValidators, the validator page's summary+series) — each one
// independently re-ran the whole O(validators) aggregation for identical
// input. This is deliberately NOT a time-based cache (no TTL, no staleness
// risk beyond loadRawSnapshot's existing 60s window): an entry lives only as
// long as its computation is in flight and is removed the instant it
// settles, so the map never grows unbounded and a later, non-concurrent
// request for the same range still recomputes fresh.
const inFlightByRangeKey = new Map<string, Promise<DashboardSnapshot>>();

function rangeKey(range: ResolvedRange): string {
  return `${range.from}:${range.to}`;
}

export async function loadDashboard(range: ResolvedRange): Promise<DashboardSnapshot> {
  const key = rangeKey(range);
  const inFlight = inFlightByRangeKey.get(key);
  if (inFlight) return inFlight;

  const promise = loadRawSnapshot().then((raw) => computeDashboardForRange(raw, range));
  inFlightByRangeKey.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightByRangeKey.delete(key);
  }
}
