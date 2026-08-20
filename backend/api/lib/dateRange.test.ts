import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GENESIS_UNIX_SECONDS, isRangePreset, parseUntil, resolveRange } from './dateRange'

test('resolveRange: all_time starts at genesis regardless of until', () => {
  const until = Date.UTC(2026, 5, 15) / 1000 // Jun 15 2026
  const range = resolveRange('all_time', until)
  assert.equal(range.from, GENESIS_UNIX_SECONDS)
  assert.equal(range.to, until)
})

test('resolveRange: last_3_months subtracts 3 calendar months from until', () => {
  const until = Date.UTC(2026, 7, 15) / 1000 // Aug 15 2026
  const range = resolveRange('last_3_months', until)
  assert.equal(range.from, Date.UTC(2026, 4, 15) / 1000) // May 15 2026
  assert.equal(range.to, until)
})

test('resolveRange: last_6_months subtracts 6 calendar months from until', () => {
  const until = Date.UTC(2026, 7, 15) / 1000
  const range = resolveRange('last_6_months', until)
  assert.equal(range.from, Date.UTC(2026, 1, 15) / 1000) // Feb 15 2026
})

test('resolveRange: last_year subtracts 12 calendar months from until', () => {
  const until = Date.UTC(2026, 7, 15) / 1000
  const range = resolveRange('last_year', until)
  assert.equal(range.from, Date.UTC(2025, 7, 15) / 1000)
})

test('resolveRange: a computed from earlier than genesis clamps to genesis', () => {
  const until = Date.UTC(2021, 3, 1) / 1000 // Apr 1 2021 — genesis is Feb 18 2021
  const range = resolveRange('last_year', until)
  assert.equal(range.from, GENESIS_UNIX_SECONDS)
})

test('isRangePreset accepts only the four known presets', () => {
  assert.equal(isRangePreset('last_3_months'), true)
  assert.equal(isRangePreset('last_6_months'), true)
  assert.equal(isRangePreset('last_year'), true)
  assert.equal(isRangePreset('all_time'), true)
  assert.equal(isRangePreset('last_30_days'), false)
  assert.equal(isRangePreset(null), false)
  assert.equal(isRangePreset(undefined), false)
  assert.equal(isRangePreset(42), false)
})

test('parseUntil: valid YYYY-MM-DD parses to that day\'s end-of-day UTC', () => {
  const parsed = parseUntil('2026-03-01')
  assert.equal(parsed, Date.UTC(2026, 2, 1, 23, 59, 59) / 1000)
})

test('parseUntil: missing or malformed input falls back to now', () => {
  const before = Math.floor(Date.now() / 1000)
  assert.equal(parseUntil(null) >= before, true)
  assert.equal(parseUntil(undefined) >= before, true)
  assert.equal(parseUntil('not-a-date') >= before, true)
  assert.equal(parseUntil('2026/03/01') >= before, true) // wrong separator
})

test('parseUntil: clamps to genesis on the low end and now on the high end', () => {
  assert.equal(parseUntil('2020-01-01'), GENESIS_UNIX_SECONDS)
  const future = parseUntil('2999-01-01')
  assert.equal(future <= Math.floor(Date.now() / 1000), true)
})
