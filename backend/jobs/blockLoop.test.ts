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

// Regression coverage for a real bug caught while running the archive layer
// end-to-end: on a fresh deploy against the archive wrapper, "tip minus
// lookbackBlocks" landed BELOW the archive's actual floor (ARCHIVE_START_HEIGHT)
// — a range that will never be archived — permanently skipping the first
// lookbackBlocks heights of the 2-year backfill. `earliest` (from
// ChainSource.getStatus()'s earliestBlockHeight) fixes this by starting
// exactly at the source's real floor instead.
test('computeFromHeight: fresh deploy with a known earliest height starts there, not tip-minus-lookback', () => {
  // tip=32,000,000, lookback would naively land at 31,900,000 — but the
  // source's real floor (the archive's start height) is 21,870,000.
  const from = computeFromHeight({ height: 0, ts: 0 }, 32_000_000, 100_000, 21_870_000);
  assert.equal(from, 21_870_000);
});

test('computeFromHeight: earliest still clamps to height 1 if somehow 0 or negative', () => {
  const from = computeFromHeight({ height: 0, ts: 0 }, 1_000_000, 100_000, 0);
  assert.equal(from, 1);
});

test('computeFromHeight: earliest is ignored on a normal (non-fresh) resume', () => {
  // Even if the source reports a floor, an already-progressing cursor must
  // still just resume at cursor+1 — earliest only matters for cursor===0.
  const from = computeFromHeight({ height: 999_900, ts: 0 }, 1_000_000, 100_000, 21_870_000);
  assert.equal(from, 999_901);
});

test('computeFromHeight: without earliest (a source that does not report one), falls back to the old tip-relative behavior', () => {
  const from = computeFromHeight({ height: 0, ts: 0 }, 1_000_000, 100_000, undefined);
  assert.equal(from, 900_000);
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
