import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMonthlyBucket, flattenPopulatedDays } from './statsSeries'
import type { ValidatorStatsMonthDoc } from './statsSeries'
import type { TimedValue } from './lookup'

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

  const bucket = buildMonthlyBucket(doc, 6, soldTimeline, priceTimeline)

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

  const bucket = buildMonthlyBucket(doc, 6, [], [])
  assert.equal(bucket.data.total_sold[0], 0)
  assert.equal(bucket.data.price[0], null)
})
