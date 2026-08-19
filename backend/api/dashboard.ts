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
import type { DashboardSnapshot, ValidatorSummaryJson } from './types';

// This is the ONLY place that turns the live Mongo collections into the
// shapes server.ts serves over HTTP. All the actual math lives in
// api/lib/* (pure, unit-tested); this file is Mongo I/O + wiring — the
// export/exportJson.ts equivalent from the (now removed) static-JSON build,
// just serving requests instead of writing files.
//
// When a time-interval selector is added, this is the single function whose
// signature grows a `range` parameter (and whose cache key includes it) — the
// aggregation call sequence below stays the same, only the Mongo queries and
// the `buildValidatorRow`/`buildNetworkMonthlyBuckets` inputs get a range filter.

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

async function computeDashboard(): Promise<DashboardSnapshot> {
  const decimals = config.decimals;

  const [validators, statsDocsRaw, sinkSalesRaw, sinkRegistryDocs, priceDocs, meta] = await Promise.all([
    Validator.find({}).lean(),
    ValidatorStats.find({}).lean(),
    ValidatorSinkSale.find({}).lean(),
    FundFlowSinkRegistry.find({}).lean(),
    Price.find({}).sort({ timestamp: 1 }).lean(),
    Meta.getSingleton(),
  ]);

  const statsDocs = statsDocsRaw as unknown as Array<ValidatorStatsMonthDoc & { operator_address: string }>;
  const statsByOperator = groupBy(statsDocs, (d) => d.operator_address);

  const sinkSales = sinkSalesRaw as unknown as Array<SinkSaleDoc & { operator_address: string }>;
  const sinkSalesByOperator = groupBy(sinkSales, (d) => d.operator_address);

  const labelByAddress = new Map(sinkRegistryDocs.map((d) => [d.address, d.label ?? null]));

  const priceTimeline: TimedValue<number>[] = priceDocs.map((p) => ({ timestamp: p.timestamp, value: p.price }));
  const latestPrice = priceTimeline.length > 0 ? priceTimeline[priceTimeline.length - 1]!.value : 0;
  const averagePrice =
    priceDocs.length > 0 ? priceDocs.reduce((sum, p) => sum + p.price, 0) / priceDocs.length : 0;

  const rows: ValidatorRow[] = [];
  const bucketsByOperator = new Map<string, MonthlyBucket[]>();

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

    const row = buildValidatorRow(identity, ownStats, ownSales, decimals);
    if (!row) continue;

    const cumulativeSoldTimeline = buildCumulativeSoldTimeline(ownSales);
    const buckets = ownStats
      .map((doc) => buildMonthlyBucket(doc, decimals, cumulativeSoldTimeline, priceTimeline))
      .sort((a, b) => a.year - b.year || a.month - b.month);

    rows.push(row);
    bucketsByOperator.set(validator.operator_address, buckets);
  }

  const ranks = rankByPercentageSold(rows);
  const summaryData = buildSummaryData(rows);
  const metrics = buildMetrics(summaryData, averagePrice);
  const networkBuckets = buildNetworkMonthlyBuckets([...bucketsByOperator.values()], priceTimeline);
  // Network-wide breakdown runs over every sink sale directly (not a sum of
  // the per-validator breakdowns below): buildSinkBreakdown's "latest per
  // pair" rule must see the whole set, and summing per-validator results
  // would silently drop validators filtered out of `rows` by total_withdraw > 0.
  const sinkBreakdown = buildSinkBreakdown(sinkSales, labelByAddress, decimals);

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
    const ownSales = sinkSalesByOperator.get(row.operator_address) ?? [];
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
      sinkBreakdown: buildSinkBreakdown(ownSales, labelByAddress, decimals),
    });
  }

  return {
    meta: {
      generated_at: Math.floor(Date.now() / 1000),
      scanned_up_to_height: meta.scanned_up_to_height,
      fund_flow_version: meta.fund_flow_current_version,
      price: latestPrice,
    },
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

// 60s TTL: validator_stats/validator_sink_sales/prices only change via the
// once-a-day backend job, so this just bounds how stale a running server can
// get after a write — not a correctness requirement.
export const loadDashboard = memoizeWithTtl(computeDashboard, 60_000);
