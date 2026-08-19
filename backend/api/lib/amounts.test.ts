import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sumBigIntStrings, uatomToAtom } from './amounts'

test('uatomToAtom divides by 10**decimals', () => {
  assert.equal(uatomToAtom('1000000', 6), 1)
  assert.equal(uatomToAtom('1500000', 6), 1.5)
  assert.equal(uatomToAtom('0', 6), 0)
})

test('uatomToAtom accepts bigint and treats null/undefined as 0', () => {
  assert.equal(uatomToAtom(2_000_000n, 6), 2)
  assert.equal(uatomToAtom(null, 6), 0)
  assert.equal(uatomToAtom(undefined, 6), 0)
})

test('sumBigIntStrings sums, skipping null/undefined/empty', () => {
  assert.equal(sumBigIntStrings(['1', '2', null, undefined, '3']), 6n)
  assert.equal(sumBigIntStrings([]), 0n)
})
