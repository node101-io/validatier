import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMetrics,
  buildNetworkMonthlyBuckets,
  buildSummaryData,
  buildValidatorRow,
  rankByPercentageSold,
} from './aggregate'
import type { ValidatorIdentity, ValidatorRow } from './aggregate'
import type { ValidatorStatsMonthDoc, MonthlyBucket } from './statsSeries'
import type { SinkSaleDoc } from './sinkSales'
import type { TimedValue } from './lookup'

function emptyMonth(): Array<number | null> {
  return new Array(31).fill(null)
}
function emptyMonthStr(): Array<string | null> {
  return new Array(31).fill(null)
}

const validator: ValidatorIdentity = {
  operator_address: 'cosmosvaloper1abc',
  moniker: 'Node101',
  temporary_image_uri: null,
  website: 'https://node101.io',
  commission_rate: '0.05',
}

function statsDoc(
  overrides: Partial<ValidatorStatsMonthDoc> = {},
): ValidatorStatsMonthDoc {
  const timestamp = emptyMonth()
  const total_stake = emptyMonthStr()
  const total_withdrawn_reward = emptyMonthStr()
  const total_withdrawn_commission = emptyMonthStr()
  timestamp[0] = 1000
  total_stake[0] = '10000000' // 10 ATOM
  total_withdrawn_reward[0] = '5000000' // 5 ATOM
  total_withdrawn_commission[0] = '1000000' // 1 ATOM
  timestamp[9] = 2000
  total_stake[9] = '20000000' // 20 ATOM
  total_withdrawn_reward[9] = '8000000' // 8 ATOM
  total_withdrawn_commission[9] = '2000000' // 2 ATOM
  return {
    year: 2026,
    month: 1,
    timestamp,
    total_stake,
    total_withdrawn_reward,
    total_withdrawn_commission,
    ...overrides,
  }
}

test('buildValidatorRow: average stake, latest cumulative withdraw, sold%, commission', () => {
  const sinkSales: SinkSaleDoc[] = [
    { sink_address: 'binance', sink_kind: 'cex', cumulative_sold: '3000000', timestamp: 2000 },
  ]
  const row = buildValidatorRow(validator, [statsDoc()], sinkSales, 6)

  assert.ok(row)
  assert.equal(row.moniker, 'Node101')
  assert.equal(row.website, 'https://node101.io')
  assert.equal(row.commission, 5) // 0.05 * 100
  assert.equal(row.average_total_stake, 15) // mean(10, 20)
  assert.equal(row.total_withdraw, 10) // latest day: 8 + 2
  assert.equal(row.sold, 3) // 3_000_000 uatom
  assert.equal(row.percentage_sold, 30) // 3 / 10 * 100
})

test('buildValidatorRow returns null when there is no populated day at all', () => {
  const doc = statsDoc()
  ;(doc.timestamp as (number | null)[]).fill(null)
  const row = buildValidatorRow(validator, [doc], [], 6)
  assert.equal(row, null)
})

test('buildValidatorRow returns null when latest total_withdraw is 0 (filtered out)', () => {
  const doc = statsDoc({
    timestamp: (() => {
      const t = emptyMonth()
      t[0] = 1000
      return t
    })(),
    total_stake: (() => {
      const s = emptyMonthStr()
      s[0] = '10000000'
      return s
    })(),
    total_withdrawn_reward: emptyMonthStr(),
    total_withdrawn_commission: emptyMonthStr(),
  })
  const row = buildValidatorRow(validator, [doc], [], 6)
  assert.equal(row, null)
})

test('buildValidatorRow clamps percentage_sold to 100 even if sold overshoots (e.g. price appreciation edge case)', () => {
  const sinkSales: SinkSaleDoc[] = [
    { sink_address: 'binance', sink_kind: 'cex', cumulative_sold: '99000000', timestamp: 2000 },
  ]
  const row = buildValidatorRow(validator, [statsDoc()], sinkSales, 6)
  assert.equal(row!.percentage_sold, 100)
})

const rows: ValidatorRow[] = [
  {
    moniker: 'A',
    temporary_image_uri: null,
    operator_address: 'op-a',
    website: null,
    commission: 5,
    average_total_stake: 100,
    total_withdraw: 10,
    sold: 5,
    percentage_sold: 50,
  },
  {
    moniker: 'B',
    temporary_image_uri: null,
    operator_address: 'op-b',
    website: null,
    commission: 5,
    average_total_stake: 200,
    total_withdraw: 20,
    sold: 4,
    percentage_sold: 20,
  },
  {
    moniker: 'C (tied with A)',
    temporary_image_uri: null,
    operator_address: 'op-c',
    website: null,
    commission: 5,
    average_total_stake: 50,
    total_withdraw: 5,
    sold: 2.5,
    percentage_sold: 50,
  },
]

test('rankByPercentageSold gives ties the same rank and skips the next one', () => {
  const ranks = rankByPercentageSold(rows)
  assert.equal(ranks.get('op-a'), 1)
  assert.equal(ranks.get('op-c'), 1)
  assert.equal(ranks.get('op-b'), 3)
})

test('buildSummaryData sums rows and derives clamped percentage_sold', () => {
  const summary = buildSummaryData(rows)
  assert.equal(summary.total_stake_sum, 350)
  assert.equal(summary.total_withdraw_sum, 35)
  assert.equal(summary.total_sold, 11.5)
  assert.equal(summary.percentage_sold, (11.5 / 35) * 100)
})

test('buildSummaryData handles zero total_withdraw_sum without dividing by zero', () => {
  const summary = buildSummaryData([])
  assert.equal(summary.percentage_sold, 0)
})

test('buildMetrics returns the fixed 3-metric shape in order', () => {
  const summary = buildSummaryData(rows)
  const metrics = buildMetrics(summary, 4.2)
  assert.deepEqual(
    metrics.map((m) => m.id),
    ['total_stake_sum', 'total_sold', 'price'],
  )
  assert.equal(metrics[0].valueNative, summary.total_stake_sum)
  assert.equal(metrics[2].valueNative, 4.2)
})

test('buildNetworkMonthlyBuckets sums per-validator buckets day by day and derives calendar timestamps', () => {
  const validatorABuckets: MonthlyBucket[] = [
    {
      year: 2026,
      month: 1,
      data: {
        timestamp: (() => {
          const t = emptyMonth()
          t[0] = 111 // arbitrary source ts, ignored in favor of calendar derivation
          return t
        })(),
        total_stake: (() => {
          const s = emptyMonth()
          s[0] = 10
          return s
        })(),
        total_sold: (() => {
          const s = emptyMonth()
          s[0] = 1
          return s
        })(),
        price: emptyMonth(),
      },
    },
  ]
  const validatorBBuckets: MonthlyBucket[] = [
    {
      year: 2026,
      month: 1,
      data: {
        timestamp: (() => {
          const t = emptyMonth()
          t[0] = 222
          return t
        })(),
        total_stake: (() => {
          const s = emptyMonth()
          s[0] = 5
          return s
        })(),
        total_sold: (() => {
          const s = emptyMonth()
          s[0] = 2
          return s
        })(),
        price: emptyMonth(),
      },
    },
  ]

  const priceTimeline: TimedValue<number>[] = [{ timestamp: 0, value: 3.5 }]
  const [network] = buildNetworkMonthlyBuckets(
    [validatorABuckets, validatorBBuckets],
    priceTimeline,
  )

  assert.equal(network.year, 2026)
  assert.equal(network.month, 1)
  assert.equal(network.data.total_stake[0], 15)
  assert.equal(network.data.total_sold[0], 3)
  assert.equal(network.data.price[0], 3.5)
  assert.equal(
    network.data.timestamp[0],
    Math.floor(Date.UTC(2026, 0, 1) / 1000),
  )
  assert.equal(network.data.total_stake[1], null) // day 2 had no data from anyone
})
