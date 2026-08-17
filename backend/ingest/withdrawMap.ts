import { chainClient } from '../chain/client';
import { operatorToAccount } from '../chain/address';
import { Validator } from '../models/Validator/Validator';
import { setDefault, applyOverride } from '../store/withdrawMap';

// Initial origin-set build. Block scanning starts "now", so past
// set_withdraw_address events are invisible — but the distribution module
// serves the CURRENT withdraw address, so we reconcile against it once.
// Going forward, the block loop applies set_withdraw_address events through
// the same applyOverride().

// polkachu rate-limits aggressively (429 at concurrency 8) — stay gentle
const LCD_CONCURRENCY = 2;
const LCD_DELAY_MS = 150;

export interface WithdrawMapStats {
  validators: number;
  overrides: number;
}

export async function buildWithdrawMap(): Promise<WithdrawMapStats> {
  const validators = await Validator.find({}, { operator_address: 1, delegator_address: 1 })
    .lean<Array<{ operator_address: string; delegator_address?: string }>>();

  // 1) defaults: derived self-account for every validator
  const entries = validators.map((v) => ({
    operator: v.operator_address,
    selfAddress: v.delegator_address ?? operatorToAccount(v.operator_address),
  }));
  for (const e of entries) setDefault(e.operator, e.selfAddress);

  // 2) reconcile with the chain's current withdraw addresses
  let overrides = 0;
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < entries.length) {
      const e = entries[cursor++];
      const res = await chainClient.lcdGet<{ withdraw_address: string }>(
        `/cosmos/distribution/v1beta1/delegators/${e.selfAddress}/withdraw_address`
      );
      if (res.withdraw_address && res.withdraw_address !== e.selfAddress) {
        applyOverride(e.operator, res.withdraw_address);
        overrides++;
      }
      await new Promise((r) => setTimeout(r, LCD_DELAY_MS));
    }
  }
  await Promise.all(Array.from({ length: LCD_CONCURRENCY }, worker));

  return { validators: entries.length, overrides };
}
