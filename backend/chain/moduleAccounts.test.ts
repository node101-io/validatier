import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moduleAddress, MODULE_ACCOUNTS, MODULE_ACCOUNT_SET } from './moduleAccounts';

// Known-good cosmoshub addresses (from docs/02, verified against the live chain).
test('moduleAddress derives the known cosmoshub module accounts', () => {
  assert.equal(MODULE_ACCOUNTS.fee_collector, 'cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta');
  assert.equal(MODULE_ACCOUNTS.distribution, 'cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl');
});

test('MODULE_ACCOUNTS covers exactly the 7 documented modules', () => {
  assert.deepEqual(Object.keys(MODULE_ACCOUNTS).sort(), [
    'bonded_tokens_pool',
    'consumer_rewards_pool',
    'distribution',
    'fee_collector',
    'gov',
    'mint',
    'not_bonded_tokens_pool',
  ]);
  assert.equal(MODULE_ACCOUNT_SET.size, 7); // no duplicate addresses
});

test('MODULE_ACCOUNT_SET answers membership', () => {
  assert.ok(MODULE_ACCOUNT_SET.has(moduleAddress('distribution')));
  assert.ok(!MODULE_ACCOUNT_SET.has('cosmos1qphf0ferqcch0jca9hlqfm3x0eds3dpkac4g9j')); // normal wallet
});
