import { uatomToAtom } from './amounts'
import { valueAtOrBefore } from './lookup'
import type { TimedValue } from './lookup'
import { flattenPopulatedDays, valueAtOrBeforeField } from './statsSeries'
import type { MonthlyBucket, ValidatorStatsMonthDoc } from './statsSeries'
import { soldInRange } from './sinkSales'
import type { SinkSaleDoc } from './sinkSales'
import type { ResolvedRange } from './dateRange'

// docs/05 "Validator row" — identity fields as read straight from Mongo `validators`.
export interface ValidatorIdentity {
  operator_address: string
  moniker?: string | null
  temporary_image_uri?: string | null
  website?: string | null
  commission_rate?: string | null
}

export interface ValidatorRow {
  moniker: string
  temporary_image_uri: string | null
  operator_address: string
  website: string | null
  commission: number
  average_total_stake: number
  total_withdraw: number
  sold: number
  percentage_sold: number
}

export interface Metric {
  id: 'total_stake_sum' | 'total_sold' | 'price'
  color: string
  title: string
  valueNative: number
}

export interface SummaryData {
  total_stake_sum: number
  total_withdraw_sum: number
  total_sold: number
  percentage_sold: number
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100)
}

// docs/05: row included only if total_withdraw > 0 — returns null to signal
// "drop this validator" rather than a zeroed-out row (viz/data.py:load_validator_summary
// applies the same filter for the same reason: otherwise the dashboard is dominated
// by empty rows for validators with no withdrawal activity yet).
//
// `range` windows every number below to [range.from, range.to] — for
// all_time, range.from is genesis, so this reduces to "every day ever" /
// "the latest day" exactly like before ranges existed; range is never
// optional so callers can't accidentally fall back to unwindowed all-time
// math (docs/03: total_withdrawn_* are cumulative snapshots, so a window
// means valueAt(to) - valueAt(from), not "the latest value").
export function buildValidatorRow(
  validator: ValidatorIdentity,
  statsMonthDocs: ReadonlyArray<ValidatorStatsMonthDoc>,
  sinkSales: ReadonlyArray<SinkSaleDoc>,
  decimals: number,
  range: ResolvedRange,
): ValidatorRow | null {
  const days = flattenPopulatedDays(statsMonthDocs)
  if (days.length === 0) return null

  const daysInRange = days.filter(
    (d) => d.timestamp >= range.from && d.timestamp <= range.to,
  )

  const stakeSamples = daysInRange
    .filter((d) => d.total_stake !== null)
    .map((d) => uatomToAtom(d.total_stake, decimals))
  const average_total_stake =
    stakeSamples.length > 0
      ? stakeSamples.reduce((a, b) => a + b, 0) / stakeSamples.length
      : 0

  // total_withdrawn_reward/commission are cumulative-to-date snapshots
  // (docs/03) — windowed total_withdraw is the delta between the last
  // snapshot at-or-before each end of the range, not a sum across days.
  const rewardDelta =
    valueAtOrBeforeField(days, range.to, 'total_withdrawn_reward') -
    valueAtOrBeforeField(days, range.from, 'total_withdrawn_reward')
  const commissionDelta =
    valueAtOrBeforeField(days, range.to, 'total_withdrawn_commission') -
    valueAtOrBeforeField(days, range.from, 'total_withdrawn_commission')
  const total_withdraw =
    uatomToAtom(rewardDelta, decimals) + uatomToAtom(commissionDelta, decimals)
  if (total_withdraw <= 0) return null

  const sold = uatomToAtom(soldInRange(sinkSales, range), decimals)
  const percentage_sold = clampPercent((sold / total_withdraw) * 100)
  const commission = validator.commission_rate
    ? Number(validator.commission_rate) * 100
    : 0

  return {
    moniker: validator.moniker ?? '',
    temporary_image_uri: validator.temporary_image_uri ?? null,
    operator_address: validator.operator_address,
    website: validator.website || null,
    commission,
    average_total_stake,
    total_withdraw,
    sold,
    percentage_sold,
  }
}

// Competition ranking (ties share a rank, next rank skips) — matches the old
// getFormattedValidatorPageData rank semantics: 1 + count of strictly-better rows.
export function rankByPercentageSold(
  rows: ReadonlyArray<ValidatorRow>,
): Map<string, number> {
  const ranks = new Map<string, number>()
  for (const row of rows) {
    const rank =
      1 + rows.filter((r) => r.percentage_sold > row.percentage_sold).length
    ranks.set(row.operator_address, rank)
  }
  return ranks
}

export function buildSummaryData(
  rows: ReadonlyArray<ValidatorRow>,
): SummaryData {
  const total_stake_sum = rows.reduce((a, r) => a + r.average_total_stake, 0)
  const total_withdraw_sum = rows.reduce((a, r) => a + r.total_withdraw, 0)
  const total_sold = rows.reduce((a, r) => a + r.sold, 0)
  const percentage_sold =
    total_withdraw_sum > 0
      ? clampPercent((total_sold / total_withdraw_sum) * 100)
      : 0
  return { total_stake_sum, total_withdraw_sum, total_sold, percentage_sold }
}

// docs/05 Metric — fixed id/color/title triple, in this order.
export function buildMetrics(
  summaryData: SummaryData,
  averagePrice: number,
): Metric[] {
  return [
    {
      id: 'total_stake_sum',
      color: '#FF9404',
      title: 'Average Delegation',
      valueNative: summaryData.total_stake_sum,
    },
    {
      id: 'total_sold',
      color: '#5856D7',
      title: 'Total Sold Amount',
      valueNative: summaryData.total_sold,
    },
    {
      id: 'price',
      color: '#31ADE6',
      title: 'Average ATOM Price',
      valueNative: averagePrice,
    },
  ]
}

// Merges every included validator's own MonthlyBucket[] into the network-wide
// series for summary.json: Σ total_stake, Σ total_sold per day, price taken
// straight from the network price series (not summed). Calendar timestamps are
// (re)derived from (year, month, day-index) rather than copied from any one
// validator's bucket, so a month with data exists here even if no single
// validator happened to have every day populated.
export function buildNetworkMonthlyBuckets(
  perValidatorBuckets: ReadonlyArray<ReadonlyArray<MonthlyBucket>>,
  priceTimeline: ReadonlyArray<TimedValue<number>>,
): MonthlyBucket[] {
  const byMonth = new Map<string, MonthlyBucket[]>()
  for (const buckets of perValidatorBuckets) {
    for (const bucket of buckets) {
      const key = `${bucket.year}-${bucket.month}`
      const list = byMonth.get(key)
      if (list) list.push(bucket)
      else byMonth.set(key, [bucket])
    }
  }

  const result: MonthlyBucket[] = []
  for (const buckets of byMonth.values()) {
    const { year, month } = buckets[0]
    const len = buckets[0].data.timestamp.length
    const timestamp: Array<number | null> = new Array(len).fill(null)
    const total_stake: Array<number | null> = new Array(len).fill(null)
    const total_sold: Array<number | null> = new Array(len).fill(null)
    const price: Array<number | null> = new Array(len).fill(null)

    for (let i = 0; i < len; i++) {
      let stakeSum = 0
      let soldSum = 0
      let hasData = false
      for (const bucket of buckets) {
        const stake = bucket.data.total_stake[i]
        if (stake !== null) {
          stakeSum += stake
          soldSum += bucket.data.total_sold[i] ?? 0
          hasData = true
        }
      }
      if (!hasData) continue

      const ts = Math.floor(Date.UTC(year, month - 1, i + 1) / 1000)
      timestamp[i] = ts
      total_stake[i] = stakeSum
      total_sold[i] = soldSum
      price[i] = valueAtOrBefore(priceTimeline, ts)
    }

    result.push({
      year,
      month,
      data: { timestamp, total_stake, total_sold, price },
    })
  }

  result.sort((a, b) => a.year - b.year || a.month - b.month)
  return result
}
