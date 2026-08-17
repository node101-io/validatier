import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatorToAccount } from './address';

// Golden pairs verified against the live chain (2026-07-16): for each, the
// derived account was confirmed on-chain as the validator's self-delegator via
// /cosmos/staking/v1beta1/validators/{op}/delegations/{derived}.
const GOLDEN_PAIRS: Array<[operator: string, account: string]> = [
  ['cosmosvaloper1qphf0ferqcch0jca9hlqfm3x0eds3dpkcvpafp', 'cosmos1qphf0ferqcch0jca9hlqfm3x0eds3dpkac4g9j'],
  ['cosmosvaloper1q6d3d089hg59x6gcx92uumx70s5y5wadklue8s', 'cosmos1q6d3d089hg59x6gcx92uumx70s5y5wadntgvtr'],
  ['cosmosvaloper1qaa9zej9a0ge3ugpx3pxyx602lxh3ztqgfnp42', 'cosmos1qaa9zej9a0ge3ugpx3pxyx602lxh3ztqda85ee'],
];

test('operatorToAccount derives the on-chain self-delegator account', () => {
  for (const [operator, account] of GOLDEN_PAIRS) {
    assert.equal(operatorToAccount(operator), account);
  }
});

test('operatorToAccount rejects non-operator addresses', () => {
  // account address (wrong prefix)
  assert.throws(() => operatorToAccount('cosmos1qphf0ferqcch0jca9hlqfm3x0eds3dpkac4g9j'));
  // corrupted checksum
  assert.throws(() => operatorToAccount('cosmosvaloper1qphf0ferqcch0jca9hlqfm3x0eds3dpkcvpafq'));
  assert.throws(() => operatorToAccount(''));
});
