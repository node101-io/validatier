import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSinkBreakdown, normalizeSinkLabel } from './sinkBreakdown'
import type { SinkSaleWithOperator } from './sinkBreakdown'

test('normalizeSinkLabel strips address-specific noise down to the exchange name', () => {
  assert.equal(normalizeSinkLabel('Upbit #18 (Staking)'), 'Upbit')
  assert.equal(normalizeSinkLabel('Upbit #17 (Staking)'), 'Upbit')
  assert.equal(normalizeSinkLabel('Binance #03 (Withdraw)'), 'Binance')
  assert.equal(normalizeSinkLabel('cex / Bybit Reserves 68'), 'Bybit Reserves 68')
  assert.equal(normalizeSinkLabel('cex-cosmoshub-3'), 'cosmoshub-3')
  assert.equal(normalizeSinkLabel('Kraken #01 [conf:medium]'), 'Kraken')
})

test('normalizeSinkLabel falls back to Unknown for missing or empty labels', () => {
  assert.equal(normalizeSinkLabel(null), 'Unknown')
  assert.equal(normalizeSinkLabel(undefined), 'Unknown')
  assert.equal(normalizeSinkLabel('   '), 'Unknown')
  assert.equal(normalizeSinkLabel('#01 ()'), 'Unknown')
})

test('buildSinkBreakdown groups per-address latest totals by exchange name, sorted desc', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'upbit-18', cumulative_sold: '100', timestamp: 10 },
    { operator_address: 'valA', sink_address: 'upbit-18', cumulative_sold: '300', timestamp: 30 }, // latest wins
    { operator_address: 'valA', sink_address: 'upbit-17', cumulative_sold: '150', timestamp: 20 },
    { operator_address: 'valA', sink_address: 'binance-03', cumulative_sold: '900', timestamp: 15 },
  ]
  const labelByAddress = new Map([
    ['upbit-18', 'Upbit #18 (Staking)'],
    ['upbit-17', 'Upbit #17 (Staking)'],
    ['binance-03', 'Binance #03 (Withdraw)'],
  ])

  const result = buildSinkBreakdown(sales, labelByAddress, 6)

  assert.deepEqual(result, [
    { name: 'Binance', sold: 0.0009 },
    { name: 'Upbit', sold: 0.00045 }, // (300 + 150) / 1e6
  ])
})

test('buildSinkBreakdown labels unregistered addresses as Unknown and drops zero totals', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'mystery', cumulative_sold: '500', timestamp: 5 },
    { operator_address: 'valA', sink_address: 'zeroed', cumulative_sold: '0', timestamp: 5 },
  ]
  const result = buildSinkBreakdown(sales, new Map(), 6)
  assert.deepEqual(result, [{ name: 'Unknown', sold: 0.0005 }])
})

test('buildSinkBreakdown returns an empty list for no sales', () => {
  assert.deepEqual(buildSinkBreakdown([], new Map(), 6), [])
})

// Regression: exchanges reuse deposit addresses, so two different validators
// can share the same sink_address. cumulative_sold is monotonic per
// (operator, sink) pair, NOT per sink alone — keying "latest" by sink_address
// only would make validator A's later-timestamped-but-smaller doc discard
// validator B's larger one instead of summing both.
test('buildSinkBreakdown sums independently across different operators sharing the same sink address', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'binance-03', cumulative_sold: '1000', timestamp: 100 },
    { operator_address: 'valB', sink_address: 'binance-03', cumulative_sold: '500', timestamp: 200 },
  ]
  const labelByAddress = new Map([['binance-03', 'Binance #03 (Withdraw)']])

  const result = buildSinkBreakdown(sales, labelByAddress, 6)

  assert.deepEqual(result, [{ name: 'Binance', sold: 0.0015 }]) // (1000 + 500) / 1e6, not just 500
})
