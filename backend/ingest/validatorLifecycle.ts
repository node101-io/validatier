import { operatorToAccount } from '../chain/address';
import { Validator } from '../models/Validator/Validator';
import { setDefault, applyOverride } from '../store/withdrawMap';
import type { CreateValidatorEvent, SetWithdrawAddressEvent } from '../chain/blockResults';

// Live validator-lifecycle handling for the block loop (task 10.1 follow-up).
// Both operations are individually IDEMPOTENT (Mongo upsert; SQLite
// setDefault=INSERT OR IGNORE; applyOverride=DELETE+INSERT converges to the
// same end state) — so they do NOT need to share a SQLite transaction with
// the height's money-transfer processing. If the process crashes anywhere in
// a height (here or in the transfer transaction), the cursor never advanced,
// and redoing this height's lifecycle events on retry is always safe.

// A brand-new validator: upsert into Mongo `validators` (same shape as the
// bulk ingest in ingest/validators.ts) and seed its default withdraw_map
// entry immediately, so a same-day reward claim resolves correctly instead
// of being rejected as "not this validator's income" by the seed guard.
export async function handleCreateValidator(e: CreateValidatorEvent): Promise<void> {
  const selfAddress = operatorToAccount(e.operator);
  await Validator.updateOne(
    { operator_address: e.operator },
    {
      $set: { delegator_address: selfAddress },
      $setOnInsert: {
        moniker: '',
        website: '',
        description: '',
        security_contact: '',
        commission_rate: '',
        keybase_id: '',
        created_at: new Date(),
      },
    },
    { upsert: true }
  );
  setDefault(e.operator, selfAddress);
}

// A withdraw address changed. We only care when the delegator IS a known
// validator's own derived account — arbitrary third-party delegators
// redirecting THEIR OWN reward withdraw address are not our concern.
// Returns true if it was applied (a known validator's override), false if
// skipped (unattributable, or not a validator's own account).
export async function handleSetWithdrawAddress(e: SetWithdrawAddressEvent): Promise<boolean> {
  if (!e.delegator) return false; // unattributable (e.g. ICA-executed) — never guess
  const validator = await Validator.findOne(
    { delegator_address: e.delegator },
    { operator_address: 1 }
  ).lean<{ operator_address: string } | null>();
  if (!validator) return false; // not a validator's self-account
  applyOverride(validator.operator_address, e.withdraw_address);
  return true;
}
