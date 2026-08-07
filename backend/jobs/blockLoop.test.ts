import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFromHeight, utcDayFromTs } from './blockLoop';

// Pure-function tests only (matches this repo's convention — e.g.
// validatorSinkSales.test.ts — of unit-testing extracted pure logic
// directly, since runBlockLoop() itself needs a live RPC/SQLite and is
// covered by manual verification instead, see the task's plan).

test('computeFromHeight: fresh deploy starts lookbackBlocks behind the tip', () => {
  const from = computeFromHeight({ height: 0, ts: 0 }, 1_000_000, 100_000);
  assert.equal(from, 900_000);
});

test('computeFromHeight: fresh deploy clamps to height 1 if lookback exceeds the tip', () => {
  const from = computeFromHeight({ height: 0, ts: 0 }, 50_000, 100_000);
  assert.equal(from, 1);
});

test('computeFromHeight: normal resume ignores lookback, continues at cursor + 1', () => {
  const from = computeFromHeight({ height: 999_900, ts: 0 }, 1_000_000, 100_000);
  assert.equal(from, 999_901);
});

test('computeFromHeight: stale cursor (gap beyond lookback) jumps forward like a fresh deploy', () => {
  const from = computeFromHeight({ height: 100_000, ts: 0 }, 1_000_000, 100_000);
  assert.equal(from, 900_000);
});

test('computeFromHeight: gap exactly at the lookback boundary still resumes normally', () => {
  const from = computeFromHeight({ height: 900_000, ts: 0 }, 1_000_000, 100_000);
  assert.equal(from, 900_001);
});

test('utcDayFromTs: same UTC calendar day maps to the same string', () => {
  const dayStart = utcDayFromTs(Date.UTC(2026, 2, 5, 0, 0, 1) / 1000);
  const dayEnd = utcDayFromTs(Date.UTC(2026, 2, 5, 23, 59, 59) / 1000);
  assert.equal(dayStart, dayEnd);
});

test('utcDayFromTs: crossing midnight UTC produces a different string', () => {
  const beforeMidnight = utcDayFromTs(Date.UTC(2026, 2, 5, 23, 59, 59) / 1000);
  const afterMidnight = utcDayFromTs(Date.UTC(2026, 2, 6, 0, 0, 0) / 1000);
  assert.notEqual(beforeMidnight, afterMidnight);
});
