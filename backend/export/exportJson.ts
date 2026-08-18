import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { Validator } from '../models/Validator/Validator';
import { ValidatorStats } from '../models/ValidatorStats/ValidatorStats';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { Price } from '../models/Price/Price';
import { Meta } from '../models/Meta/Meta';
import { buildCumulativeSoldTimeline, type SinkSaleDoc } from './lib/sinkSales';
import { buildMonthlyBucket, type MonthlyBucket, type ValidatorStatsMonthDoc } from './lib/statsSeries';
import {
  buildMetrics,
  buildNetworkMonthlyBuckets,
  buildSummaryData,
  buildValidatorRow,
  rankByPercentageSold,
  type ValidatorIdentity,
  type ValidatorRow,
} from './lib/aggregate';
import type { TimedValue } from './lib/lookup';

// docs/05-static-json-contract.md — this is the ONLY place that turns the live
// Mongo collections into the frontend's static all_time JSON tree. All the
// actual math lives in export/lib/* (pure, unit-tested); this file is just
// Mongo I/O + wiring + fs writes.

export interface ExportResult {
  outDir: string;
  validatorsIncluded: number;
  validatorsSkipped: number;
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function exportStaticJson(outDir: string): Promise<ExportResult> {
  const decimals = config.decimals;

  const [validators, statsDocsRaw, sinkSalesRaw, priceDocs, meta] = await Promise.all([
    Validator.find({}).lean(),
    ValidatorStats.find({}).lean(),
    ValidatorSinkSale.find({}).lean(),
    Price.find({}).sort({ timestamp: 1 }).lean(),
    Meta.getSingleton(),
  ]);

  const statsDocs = statsDocsRaw as unknown as Array<ValidatorStatsMonthDoc & { operator_address: string }>;
  const statsByOperator = groupBy(statsDocs, (d) => d.operator_address);

  const sinkSales = sinkSalesRaw as unknown as Array<SinkSaleDoc & { operator_address: string }>;
  const sinkSalesByOperator = groupBy(sinkSales, (d) => d.operator_address);

  const priceTimeline: TimedValue<number>[] = priceDocs.map((p) => ({ timestamp: p.timestamp, value: p.price }));
  const latestPrice = priceTimeline.length > 0 ? priceTimeline[priceTimeline.length - 1]!.value : 0;
  const averagePrice =
    priceDocs.length > 0 ? priceDocs.reduce((sum, p) => sum + p.price, 0) / priceDocs.length : 0;

  const rows: ValidatorRow[] = [];
  const bucketsByOperator = new Map<string, MonthlyBucket[]>();
  let skipped = 0;

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
    if (!row) {
      skipped++;
      continue;
    }

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

  const generatedAt = Math.floor(Date.now() / 1000);

  await writeJson(path.join(outDir, 'meta.json'), {
    generated_at: generatedAt,
    scanned_up_to_height: meta.scanned_up_to_height,
    fund_flow_version: meta.fund_flow_current_version,
    price: latestPrice,
  });

  await writeJson(path.join(outDir, 'summary.json'), {
    summaryData,
    metrics,
    stats: networkBuckets,
  });

  await writeJson(path.join(outDir, 'validators.json'), { validators: rows });

  const validatorByOperator = new Map(validators.map((v) => [v.operator_address, v]));

  for (const row of rows) {
    const validator = validatorByOperator.get(row.operator_address)!;
    // Per-validator metrics — NOT the network-wide `metrics` above. A
    // validator's own detail page must show its own average stake / sold,
    // not the sum across every validator (docs/05: ValidatorRow fields).
    const validatorMetrics = buildMetrics(
      {
        total_stake_sum: row.average_total_stake,
        total_withdraw_sum: row.total_withdraw,
        total_sold: row.sold,
        percentage_sold: row.percentage_sold,
      },
      averagePrice
    );
    await writeJson(path.join(outDir, 'validator', `${row.operator_address}.json`), {
      validator: {
        ...row,
        description: validator.description ?? null,
        security_contact: validator.security_contact ?? null,
        delegator_address: validator.delegator_address ?? null,
        commission_rate: validator.commission_rate ?? '0',
      },
      metrics: validatorMetrics,
      stats: bucketsByOperator.get(row.operator_address) ?? [],
      ranks: {
        percentageSoldRank: ranks.get(row.operator_address) ?? rows.length,
        totalValidators: rows.length,
      },
    });
  }

  return { outDir, validatorsIncluded: rows.length, validatorsSkipped: skipped };
}
