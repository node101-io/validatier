import { uatomToAtom } from './amounts'
import { valueAtOrBefore } from './lookup'
import type { TimedValue } from './lookup'
import type { ResolvedRange } from './dateRange'

// Mirrors one Mongo `validator_stats` doc (docs/03) — fixed length-31 arrays,
// index = day-1, unset days are null.
export interface ValidatorStatsMonthDoc {
  year: number
  month: number
  timestamp: ReadonlyArray<number | null>
  total_stake: ReadonlyArray<string | null>
  total_withdrawn_reward: ReadonlyArray<string | null>
  total_withdrawn_commission: ReadonlyArray<string | null>
}

export interface MonthlyBucket {
  year: number
  month: number
  data: {
    timestamp: Array<number | null>
    total_stake: Array<number | null>
    total_sold: Array<number | null>
    price: Array<number | null>
  }
}

export interface PopulatedDay {
  timestamp: number
  total_stake: string | null
  total_withdrawn_reward: string | null
  total_withdrawn_commission: string | null
}

// Flattens the month-bucketed docs into one row per actually-populated day,
// chronological — the all_time equivalent of viz/data.py's
// _flatten_validator_stats, used by aggregate.ts to find "the latest day" and
// "every stake sample" without re-walking the 31-slot arrays each time.
export function flattenPopulatedDays(
  docs: ReadonlyArray<ValidatorStatsMonthDoc>,
): PopulatedDay[] {
  const rows: PopulatedDay[] = []
  for (const doc of docs) {
    for (let i = 0; i < doc.timestamp.length; i++) {
      const ts = doc.timestamp[i]
      if (ts === null) continue
      rows.push({
        timestamp: ts,
        total_stake: doc.total_stake[i] ?? null,
        total_withdrawn_reward: doc.total_withdrawn_reward[i] ?? null,
        total_withdrawn_commission: doc.total_withdrawn_commission[i] ?? null,
      })
    }
  }
  rows.sort((a, b) => a.timestamp - b.timestamp)
  return rows
}

// Reads one PopulatedDay field as-of a timestamp — the same valueAtOrBefore
// "last snapshot at-or-before t" rule used everywhere else, applied to the
// cumulative total_withdrawn_reward/commission fields so buildValidatorRow
// can compute a windowed delta instead of always reading the latest day.
export function valueAtOrBeforeField(
  days: ReadonlyArray<PopulatedDay>,
  ts: number,
  field: 'total_withdrawn_reward' | 'total_withdrawn_commission',
): bigint {
  let answer: bigint = 0n
  for (const day of days) {
    if (day.timestamp > ts) break
    const raw = day[field]
    if (raw !== null) answer = BigInt(raw)
  }
  return answer
}

// Builds one export MonthlyBucket from a raw validator_stats doc, filling
// total_sold/price by looking up this validator's own cumulative-sold and the
// network price series as-of each populated day (docs/05 MonthlyBucket).
// total_sold is windowed to `range`: valueAt(ts) - valueAt(range.from), so a
// "last 3 months" chart shows sales within the window, not the multi-year
// cumulative total. Days outside [range.from, range.to] stay null (same
// convention as an unpopulated day).
export function buildMonthlyBucket(
  doc: ValidatorStatsMonthDoc,
  decimals: number,
  cumulativeSoldTimeline: ReadonlyArray<TimedValue<bigint>>,
  priceTimeline: ReadonlyArray<TimedValue<number>>,
  range: ResolvedRange,
): MonthlyBucket {
  const len = doc.timestamp.length
  const timestamp: Array<number | null> = new Array(len).fill(null)
  const total_stake: Array<number | null> = new Array(len).fill(null)
  const total_sold: Array<number | null> = new Array(len).fill(null)
  const price: Array<number | null> = new Array(len).fill(null)

  const soldAtRangeStart = valueAtOrBefore(cumulativeSoldTimeline, range.from) ?? 0n

  for (let i = 0; i < len; i++) {
    const ts = doc.timestamp[i]
    if (ts === null) continue
    if (ts < range.from || ts > range.to) continue

    timestamp[i] = ts
    total_stake[i] = uatomToAtom(doc.total_stake[i], decimals)

    const soldAsOfDay = valueAtOrBefore(cumulativeSoldTimeline, ts) ?? 0n
    total_sold[i] = uatomToAtom(soldAsOfDay - soldAtRangeStart, decimals)

    price[i] = valueAtOrBefore(priceTimeline, ts)
  }

  return {
    year: doc.year,
    month: doc.month,
    data: { timestamp, total_stake, total_sold, price },
  }
}
