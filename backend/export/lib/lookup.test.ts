import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valueAtOrBefore, type TimedValue } from './lookup';

const series: Array<TimedValue<string>> = [
  { timestamp: 100, value: 'a' },
  { timestamp: 200, value: 'b' },
  { timestamp: 300, value: 'c' },
];

test('valueAtOrBefore returns the exact match', () => {
  assert.equal(valueAtOrBefore(series, 200), 'b');
});

test('valueAtOrBefore returns the last entry before ts', () => {
  assert.equal(valueAtOrBefore(series, 250), 'b');
  assert.equal(valueAtOrBefore(series, 999), 'c');
});

test('valueAtOrBefore returns null before the first entry or on empty series', () => {
  assert.equal(valueAtOrBefore(series, 50), null);
  assert.equal(valueAtOrBefore([], 50), null);
});
