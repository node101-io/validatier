import { operatorToAccount } from '../chain/address';
import { fetchAllStakingValidators } from '../chain/stakingValidators';
import { Validator } from '../models/Validator/Validator';

// Full validator sync from LCD staking (all statuses: bonded/unbonding/unbonded).
// This IS the "genesis + every create_validator so far" set — we cannot scan
// historical events on pruned nodes, and don't need to: the staking module
// keeps every validator ever created. Idempotent upsert, safe to re-run.
// Called weekly (chain-day gated in jobs/dailyJobs.ts) — moniker/website/
// commission/keybase_id rarely change, so a daily re-pull is unnecessary LCD
// load. Keybase AVATAR resolution is a separate concern — see
// syncKeybaseAvatars() below, driven by a real wall-clock daily cron.

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
  const validators = await fetchAllStakingValidators<LcdValidator>();
  if (validators.length > 0) {
    await Validator.bulkWrite(validators.map(toUpsertOp), { ordered: false });
  }
  return validators.length;
}

// ── Keybase avatar resolution ───────────────────────────────────────────
// Separate from syncValidatorsFromChain on purpose: this reads keybase_id
// straight out of Mongo (already synced by the weekly LCD pull above) and
// is meant to be invoked by a REAL wall-clock daily cron (scripts/
// syncKeybaseAvatars.ts), not the blockchain-day-driven job loop — avatar
// freshness has nothing to do with chain sync progress.

interface KeybaseLookupResponse {
  them: Array<{ pictures?: { primary?: { url?: string } } } | null>;
}

const KEYBASE_LOOKUP_URL = 'https://keybase.io/_/api/1.0/user/lookup.json';
const KEYBASE_CONCURRENCY = 10;
const KEYBASE_REQUEST_TIMEOUT_MS = 15_000; // same budget as chain/client.ts and priceSync.ts

// key_suffix takes exactly ONE identity per request — comma-joining or
// repeating the param makes Keybase reject the whole call with a "bad hex
// string" INPUT_ERROR, even when every id is individually valid. So this
// fires one request per identity, capped at KEYBASE_CONCURRENCY in flight.
async function lookupOne(identity: string): Promise<string | undefined> {
  const params = new URLSearchParams({ key_suffix: identity, fields: 'pictures' });
  try {
    const res = await fetch(`${KEYBASE_LOOKUP_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(KEYBASE_REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as KeybaseLookupResponse;
    return data.them?.[0]?.pictures?.primary?.url;
  } catch {
    // timeout, network hiccup, or invalid identity (e.g. a plain username
    // instead of a keybase key fingerprint) — leave this one unresolved
    return undefined;
  }
}

export interface KeybaseSyncStats {
  identitiesChecked: number;
  avatarsResolved: number;
}

// Resolves every known validator's keybase_id -> avatar URL and writes
// temporary_image_uri. Only overwrites when a fresh URL was actually
// resolved this run, so a Keybase outage or an identity with no picture set
// leaves the last-known avatar in place instead of clearing it.
export async function syncKeybaseAvatars(): Promise<KeybaseSyncStats> {
  const validators = await Validator.find(
    { keybase_id: { $ne: '' } },
    { operator_address: 1, keybase_id: 1 }
  ).lean<Array<{ operator_address: string; keybase_id: string }>>();

  const uniqueIdentities = [...new Set(validators.map((v) => v.keybase_id))];
  const avatars = new Map<string, string>();
  for (let i = 0; i < uniqueIdentities.length; i += KEYBASE_CONCURRENCY) {
    const batch = uniqueIdentities.slice(i, i + KEYBASE_CONCURRENCY);
    const urls = await Promise.all(batch.map(lookupOne));
    batch.forEach((id, idx) => {
      const url = urls[idx];
      if (url) avatars.set(id, url);
    });
  }

  const ops = validators
    .filter((v) => avatars.has(v.keybase_id))
    .map((v) => ({
      updateOne: {
        filter: { operator_address: v.operator_address },
        update: { $set: { temporary_image_uri: avatars.get(v.keybase_id) } },
      },
    }));
  if (ops.length > 0) {
    await Validator.bulkWrite(ops, { ordered: false });
  }

  return { identitiesChecked: uniqueIdentities.length, avatarsResolved: avatars.size };
}
