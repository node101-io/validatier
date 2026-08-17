import { sha256 } from '@cosmjs/crypto';
import { toBech32 } from '@cosmjs/encoding';
import { config } from '../config';

// Cosmos SDK module accounts are DERIVED, never fetched:
// module_address = bech32(prefix, sha256(module_name)[:20])
export function moduleAddress(name: string, prefix: string = config.bech32Prefix): string {
  return toBech32(prefix, sha256(new TextEncoder().encode(name)).slice(0, 20));
}

// Computed once at startup. Taint engine usage:
//  - distribution -> withdrawAddr  = seed inflow (credit, no edge)
//  - any other module account as sender/recipient = protocol noise -> skip
export const MODULE_ACCOUNTS = {
  fee_collector: moduleAddress('fee_collector'),
  distribution: moduleAddress('distribution'),
  mint: moduleAddress('mint'),
  bonded_tokens_pool: moduleAddress('bonded_tokens_pool'),
  not_bonded_tokens_pool: moduleAddress('not_bonded_tokens_pool'),
  gov: moduleAddress('gov'),
  consumer_rewards_pool: moduleAddress('consumer_rewards_pool'), // ICS
} as const;

// O(1) membership check for the exclusion rule in the taint engine.
export const MODULE_ACCOUNT_SET: ReadonlySet<string> = new Set(Object.values(MODULE_ACCOUNTS));
