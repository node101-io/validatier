import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSinkBreakdown, normalizeSinkLabel } from './sinkBreakdown'
import type { SinkSaleWithOperator } from './sinkBreakdown'
import type { ResolvedRange } from './dateRange'

// Wide enough to cover every timestamp in this file (5-200) — stands in for
// "all_time" so the pre-existing tests read the same as before ranges existed.
const ALL: ResolvedRange = { from: 0, to: 1_000 }

test('normalizeSinkLabel strips address-specific noise down to the exchange name', () => {
  assert.equal(normalizeSinkLabel('Upbit #18 (Staking)'), 'Upbit')
  assert.equal(normalizeSinkLabel('Upbit #17 (Staking)'), 'Upbit')
  assert.equal(normalizeSinkLabel('Binance #03 (Withdraw)'), 'Binance')
  assert.equal(normalizeSinkLabel('cex / Bybit Reserves 68'), 'Bybit Reserves 68')
  assert.equal(normalizeSinkLabel('cex-cosmoshub-3'), 'cosmoshub-3')
  assert.equal(normalizeSinkLabel('Kraken #01 [conf:medium]'), 'Kraken')
})

test('normalizeSinkLabel falls back to Unknown for a missing label on a cex/dex sink', () => {
  assert.equal(normalizeSinkLabel(null, 'cex'), 'Unknown')
  assert.equal(normalizeSinkLabel(undefined, 'dex'), 'Unknown')
  assert.equal(normalizeSinkLabel('   ', 'cex'), 'Unknown')
  assert.equal(normalizeSinkLabel('#01 ()', 'cex'), 'Unknown')
  assert.equal(normalizeSinkLabel(null), 'Unknown') // kind omitted defaults like cex/dex
})

test('normalizeSinkLabel falls back to IBC Transfers for a missing label on an ibc_out sink', () => {
  // ibc_out is a known terminal (money left the chain), not an unidentified
  // exchange — it must not be lumped into "Unknown" alongside genuinely
  // unregistered cex/dex addresses.
  assert.equal(normalizeSinkLabel(null, 'ibc_out'), 'IBC Transfers')
  assert.equal(normalizeSinkLabel(undefined, 'ibc_out'), 'IBC Transfers')
})

test('buildSinkBreakdown groups per-address latest totals by exchange name, sorted desc', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'upbit-18', sink_kind: 'cex', cumulative_sold: '100', timestamp: 10 },
    { operator_address: 'valA', sink_address: 'upbit-18', sink_kind: 'cex', cumulative_sold: '300', timestamp: 30 }, // latest wins
    { operator_address: 'valA', sink_address: 'upbit-17', sink_kind: 'cex', cumulative_sold: '150', timestamp: 20 },
    { operator_address: 'valA', sink_address: 'binance-03', sink_kind: 'cex', cumulative_sold: '900', timestamp: 15 },
  ]
  const labelByAddress = new Map([
    ['upbit-18', 'Upbit #18 (Staking)'],
    ['upbit-17', 'Upbit #17 (Staking)'],
    ['binance-03', 'Binance #03 (Withdraw)'],
  ])

  const result = buildSinkBreakdown(sales, labelByAddress, 6, ALL)

  assert.deepEqual(result, [
    { name: 'Binance', sold: 0.0009 },
    { name: 'Upbit', sold: 0.00045 }, // (300 + 150) / 1e6
  ])
})

test('buildSinkBreakdown labels unregistered cex/dex addresses as Unknown and drops zero totals', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'mystery', sink_kind: 'cex', cumulative_sold: '500', timestamp: 5 },
    { operator_address: 'valA', sink_address: 'zeroed', sink_kind: 'cex', cumulative_sold: '0', timestamp: 5 },
  ]
  const result = buildSinkBreakdown(sales, new Map(), 6, ALL)
  assert.deepEqual(result, [{ name: 'Unknown', sold: 0.0005 }])
})

test('buildSinkBreakdown buckets unregistered ibc_out addresses under IBC Transfers, separate from Unknown', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'ibc-escrow-1', sink_kind: 'ibc_out', cumulative_sold: '400', timestamp: 5 },
    { operator_address: 'valA', sink_address: 'ibc-escrow-2', sink_kind: 'ibc_out', cumulative_sold: '600', timestamp: 5 },
    { operator_address: 'valA', sink_address: 'mystery-cex', sink_kind: 'cex', cumulative_sold: '100', timestamp: 5 },
  ]
  const result = buildSinkBreakdown(sales, new Map(), 6, ALL)
  assert.deepEqual(result, [
    { name: 'IBC Transfers', sold: 0.001 }, // (400 + 600) / 1e6
    { name: 'Unknown', sold: 0.0001 },
  ])
})

test('buildSinkBreakdown returns an empty list for no sales', () => {
  assert.deepEqual(buildSinkBreakdown([], new Map(), 6, ALL), [])
})

// Regression: exchanges reuse deposit addresses, so two different validators
// can share the same sink_address. cumulative_sold is monotonic per
// (operator, sink) pair, NOT per sink alone — keying "latest" by sink_address
// only would make validator A's later-timestamped-but-smaller doc discard
// validator B's larger one instead of summing both.
test('buildSinkBreakdown sums independently across different operators sharing the same sink address', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'binance-03', sink_kind: 'cex', cumulative_sold: '1000', timestamp: 100 },
    { operator_address: 'valB', sink_address: 'binance-03', sink_kind: 'cex', cumulative_sold: '500', timestamp: 200 },
  ]
  const labelByAddress = new Map([['binance-03', 'Binance #03 (Withdraw)']])

  const result = buildSinkBreakdown(sales, labelByAddress, 6, ALL)

  assert.deepEqual(result, [{ name: 'Binance', sold: 0.0015 }]) // (1000 + 500) / 1e6, not just 500
})

test('buildSinkBreakdown windows to [range.from, range.to]: carries forward the pre-window baseline instead of dropping it', () => {
  const sales: SinkSaleWithOperator[] = [
    { operator_address: 'valA', sink_address: 'upbit-18', sink_kind: 'cex', cumulative_sold: '100', timestamp: 10 }, // before the window
    { operator_address: 'valA', sink_address: 'upbit-18', sink_kind: 'cex', cumulative_sold: '300', timestamp: 30 }, // inside the window
    { operator_address: 'valA', sink_address: 'upbit-18', sink_kind: 'cex', cumulative_sold: '900', timestamp: 90 }, // after the window
  ]
  const labelByAddress = new Map([['upbit-18', 'Upbit #18 (Staking)']])

  // Window [20, 40]: baseline at t=20 is the ts=10 doc (100), latest at-or-before
  // t=40 is the ts=30 doc (300) — delta = 200, NOT the full 900 total, and NOT 0
  // (which a naive "filter the input array to [20,40]" implementation would give,
  // since the baseline doc at ts=10 falls outside that filter).
  const result = buildSinkBreakdown(sales, labelByAddress, 6, { from: 20, to: 40 })

  assert.deepEqual(result, [{ name: 'Upbit', sold: 0.0002 }]) // (300 - 100) / 1e6
})
