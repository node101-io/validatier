import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCumulativeSoldTimeline, latestCumulativeByPair, type SinkSaleDoc } from './sinkSales';

const sales: SinkSaleDoc[] = [
  { sink_address: 'binance', cumulative_sold: '100', timestamp: 10 },
  { sink_address: 'binance', cumulative_sold: '300', timestamp: 30 },
  { sink_address: 'osmosis-dex', cumulative_sold: '50', timestamp: 20 },
];

test('latestCumulativeByPair sums the most recent entry per sink_address', () => {
  // binance latest = 300 (ts 30), osmosis-dex latest = 50 (ts 20, its only entry)
  assert.equal(latestCumulativeByPair(sales), 350n);
});

test('latestCumulativeByPair returns 0 for an empty list', () => {
  assert.equal(latestCumulativeByPair([]), 0n);
});

test('buildCumulativeSoldTimeline produces a running total across sinks', () => {
  const timeline = buildCumulativeSoldTimeline(sales);
  assert.deepEqual(
    timeline.map((p) => [p.timestamp, p.value]),
    [
      [10, 100n], // binance=100
      [20, 150n], // binance=100 + osmosis-dex=50
      [30, 350n], // binance=300 + osmosis-dex=50
    ]
  );
});

test('buildCumulativeSoldTimeline merges same-timestamp events into one point', () => {
  const timeline = buildCumulativeSoldTimeline([
    { sink_address: 'a', cumulative_sold: '10', timestamp: 5 },
    { sink_address: 'b', cumulative_sold: '20', timestamp: 5 },
  ]);
  assert.deepEqual(timeline, [{ timestamp: 5, value: 30n }]);
});
