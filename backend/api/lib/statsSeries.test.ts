import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMonthlyBucket, flattenPopulatedDays, valueAtOrBeforeField } from './statsSeries'
import type { ValidatorStatsMonthDoc, PopulatedDay } from './statsSeries'
import type { TimedValue } from './lookup'
import type { ResolvedRange } from './dateRange'

// Wide enough to cover every timestamp in this file (50-200) — stands in for
// "all_time" so the pre-existing tests read the same as before ranges existed.
const ALL: ResolvedRange = { from: 0, to: 1_000 }

function emptyMonth(): Array<number | null> {
  return new Array(31).fill(null)
}
function emptyMonthStr(): Array<string | null> {
  return new Array(31).fill(null)
}

test('flattenPopulatedDays skips unset days and sorts chronologically', () => {
  const doc1: ValidatorStatsMonthDoc = {
    year: 2026,
    month: 8,
    timestamp: emptyMonth(),
    total_stake: emptyMonthStr(),
    total_withdrawn_reward: emptyMonthStr(),
    total_withdrawn_commission: emptyMonthStr(),
  }
  ;(doc1.timestamp as (number | null)[])[4] = 2000 // day 5
  ;(doc1.total_stake as (string | null)[])[4] = '5000000'

  const doc0: ValidatorStatsMonthDoc = {
    year: 2026,
    month: 7,
    timestamp: emptyMonth(),
    total_stake: emptyMonthStr(),
    total_withdrawn_reward: emptyMonthStr(),
    total_withdrawn_commission: emptyMonthStr(),
  }
  ;(doc0.timestamp as (number | null)[])[9] = 1000 // day 10, but earlier month
  ;(doc0.total_stake as (string | null)[])[9] = '3000000'

  const rows = flattenPopulatedDays([doc1, doc0])
  assert.equal(rows.length, 2)
  assert.deepEqual(
    rows.map((r) => r.timestamp),
    [1000, 2000],
  )
})

test('buildMonthlyBucket fills only populated days, converts to ATOM, and looks up sold/price as-of each day', () => {
  const timestamp = emptyMonth()
  const total_stake = emptyMonthStr()
  timestamp[0] = 100 // day 1
  total_stake[0] = '1000000' // 1 ATOM
  timestamp[1] = 200 // day 2
  total_stake[1] = '2000000' // 2 ATOM

  const doc: ValidatorStatsMonthDoc = {
    year: 2026,
    month: 1,
    timestamp,
    total_stake,
    total_withdrawn_reward: emptyMonthStr(),
    total_withdrawn_commission: emptyMonthStr(),
  }

  const soldTimeline: TimedValue<bigint>[] = [
    { timestamp: 100, value: 500_000n },
  ]
  const priceTimeline: TimedValue<number>[] = [{ timestamp: 50, value: 4.2 }]

  const bucket = buildMonthlyBucket(doc, 6, soldTimeline, priceTimeline, ALL)

  assert.equal(bucket.year, 2026)
  assert.equal(bucket.month, 1)
  assert.equal(bucket.data.timestamp[0], 100)
  assert.equal(bucket.data.total_stake[0], 1)
  assert.equal(bucket.data.total_sold[0], 0.5) // 500_000 uatom @ decimals=6
  assert.equal(bucket.data.price[0], 4.2)

  assert.equal(bucket.data.total_stake[1], 2)
  assert.equal(bucket.data.total_sold[1], 0.5) // still last known as-of day 2

  // unset days stay null across every field
  assert.equal(bucket.data.timestamp[2], null)
  assert.equal(bucket.data.total_stake[2], null)
  assert.equal(bucket.data.total_sold[2], null)
  assert.equal(bucket.data.price[2], null)
})

test('buildMonthlyBucket defaults total_sold to 0 when no sale predates the day', () => {
  const timestamp = emptyMonth()
  const total_stake = emptyMonthStr()
  timestamp[0] = 100
  total_stake[0] = '1000000'

  const doc: ValidatorStatsMonthDoc = {
    year: 2026,
    month: 1,
    timestamp,
    total_stake,
    total_withdrawn_reward: emptyMonthStr(),
    total_withdrawn_commission: emptyMonthStr(),
  }

  const bucket = buildMonthlyBucket(doc, 6, [], [], ALL)
  assert.equal(bucket.data.total_sold[0], 0)
  assert.equal(bucket.data.price[0], null)
})

test('buildMonthlyBucket windows total_sold to a delta from range.from and skips days outside the range', () => {
  const timestamp = emptyMonth()
  const total_stake = emptyMonthStr()
  timestamp[0] = 100 // day 1
  total_stake[0] = '1000000'
  timestamp[1] = 200 // day 2
  total_stake[1] = '2000000'
  timestamp[2] = 300 // day 3, outside the range below
  total_stake[2] = '3000000'

  const doc: ValidatorStatsMonthDoc = {
    year: 2026,
    month: 1,
    timestamp,
    total_stake,
    total_withdrawn_reward: emptyMonthStr(),
    total_withdrawn_commission: emptyMonthStr(),
  }

  // cumulative sold: 500_000 as of day 1, 900_000 as of day 2.
  const soldTimeline: TimedValue<bigint>[] = [
    { timestamp: 100, value: 500_000n },
    { timestamp: 200, value: 900_000n },
  ]

  // Window [150, 250]: day 1 (ts=100) falls before it, day 3 (ts=300) falls
  // after — only day 2 is populated. Its total_sold is the delta from the
  // range's baseline (valueAt(150) = 500_000, the day-1 value carried
  // forward), not the raw cumulative 900_000.
  const bucket = buildMonthlyBucket(doc, 6, soldTimeline, [], { from: 150, to: 250 })

  assert.equal(bucket.data.timestamp[0], null)
  assert.equal(bucket.data.total_sold[0], null)
  assert.equal(bucket.data.timestamp[1], 200)
  assert.equal(bucket.data.total_sold[1], 0.4) // (900_000 - 500_000) / 1e6
  assert.equal(bucket.data.timestamp[2], null)
  assert.equal(bucket.data.total_sold[2], null)
})

test('valueAtOrBeforeField reads the cumulative field as-of a timestamp, carrying the last known value forward', () => {
  const days: PopulatedDay[] = [
    { timestamp: 100, total_stake: null, total_withdrawn_reward: '5000000', total_withdrawn_commission: null },
    { timestamp: 200, total_stake: null, total_withdrawn_reward: '8000000', total_withdrawn_commission: null },
  ]

  assert.equal(valueAtOrBeforeField(days, 50, 'total_withdrawn_reward'), 0n) // before any doc
  assert.equal(valueAtOrBeforeField(days, 100, 'total_withdrawn_reward'), 5_000_000n)
  assert.equal(valueAtOrBeforeField(days, 150, 'total_withdrawn_reward'), 5_000_000n) // carried forward
  assert.equal(valueAtOrBeforeField(days, 200, 'total_withdrawn_reward'), 8_000_000n)
})
