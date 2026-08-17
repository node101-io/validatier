import { chainClient } from '../chain/client';
import { operatorToAccount } from '../chain/address';
import { Validator } from '../models/Validator/Validator';

// Full validator sync from LCD staking (all statuses: bonded/unbonding/unbonded).
// This IS the "genesis + every create_validator so far" set — we cannot scan
// historical events on pruned nodes, and don't need to: the staking module
// keeps every validator ever created. Idempotent upsert, safe to re-run.

interface LcdValidator {
  operator_address: string;
  description?: {
    moniker?: string;
    identity?: string; // keybase id
    website?: string;
    security_contact?: string;
    details?: string;
  };
  commission?: { commission_rates?: { rate?: string } };
}

interface LcdValidatorsPage {
  validators: LcdValidator[];
  pagination?: { next_key: string | null };
}

function toUpsertOp(v: LcdValidator) {
  const d = v.description ?? {};
  return {
    updateOne: {
      filter: { operator_address: v.operator_address },
      update: {
        $set: {
          // account address derived from the operator bytes — NOT fetched
          delegator_address: operatorToAccount(v.operator_address),
          moniker: d.moniker ?? '',
          website: d.website ?? '',
          description: d.details ?? '',
          security_contact: d.security_contact ?? '',
          commission_rate: v.commission?.commission_rates?.rate ?? '',
          keybase_id: d.identity ?? '',
        },
        $setOnInsert: { created_at: new Date() },
      },
      upsert: true,
    },
  };
}

export async function syncValidatorsFromChain(): Promise<number> {
  let nextKey: string | null = null;
  let total = 0;
  do {
    const params = new URLSearchParams({ 'pagination.limit': '500' });
    if (nextKey) params.set('pagination.key', nextKey);
    const page = await chainClient.lcdGet<LcdValidatorsPage>(
      `/cosmos/staking/v1beta1/validators?${params.toString()}`
    );
    if (page.validators.length > 0) {
      await Validator.bulkWrite(page.validators.map(toUpsertOp), { ordered: false });
      total += page.validators.length;
    }
    nextKey = page.pagination?.next_key ?? null;
  } while (nextKey);
  return total;
}
