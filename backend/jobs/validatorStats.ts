import { chainClient, HttpError } from '../chain/client';
import { getSqlite } from '../db/sqlite';
import { Validator } from '../models/Validator/Validator';
import { ValidatorStats } from '../models/ValidatorStats/ValidatorStats';

// Daily stake snapshot (docs/02 validator_stats section, docs/04 validator_state
// table). Pure ABSOLUTE snapshots — no deltas/prefix_sum. total_withdrawn_* are
// cumulative but still snapshot-semantics (interval = diff of two rows), sourced
// from SQLite `seed` (fund-flow pipeline), NOT from these REST endpoints.

// polkachu rate-limits aggressively at higher concurrency (429s seen at 8 in
// task 5.2) — same gentle profile that worked for the 625-validator withdraw_map build.
const LCD_CONCURRENCY = 2;
const LCD_DELAY_MS = 150;

interface LcdValidatorResponse {
  validator: { tokens: string };
}
interface LcdDelegationResponse {
  delegation_response: { balance: { amount: string } };
}

interface SeedTotals {
  reward: bigint;
  commission: bigint;
}

function readSeedTotals(operator: string): SeedTotals {
  const row = getSqlite()
    .prepare('SELECT reward_withdrawn, commission_withdrawn FROM seed WHERE origin = ?')
    .get(operator) as { reward_withdrawn: bigint; commission_withdrawn: bigint } | undefined;
  return row
    ? { reward: row.reward_withdrawn, commission: row.commission_withdrawn }
    : { reward: 0n, commission: 0n };
}

function upsertValidatorState(row: {
  epoch: number;
  operator: string;
  self_stake: bigint;
  total_stake: bigint;
  block_height: number;
  ts: number;
}): void {
  getSqlite()
    .prepare(
      `INSERT INTO validator_state (epoch, operator, self_stake, total_stake, block_height, ts)
       VALUES (@epoch, @operator, @self_stake, @total_stake, @block_height, @ts)
       ON CONFLICT(epoch, operator) DO UPDATE SET
         self_stake   = excluded.self_stake,
         total_stake  = excluded.total_stake,
         block_height = excluded.block_height,
         ts           = excluded.ts`
    )
    .run(row);
}

export interface DailyStatsResult {
  height: number;
  epoch: number;
  attempted: number;
  succeeded: number;
  skipped: Array<{ operator_address: string; reason: string }>;
}

// atHeight defaults to the current chain tip — the standalone/dev default and
// also what the eventual daily scheduler (task 10.2) will pass under the hood
// (the latest height at the moment the cron fires).
export async function runDailyValidatorStats(atHeight?: number): Promise<DailyStatsResult> {
  const height = atHeight ?? (await chainClient.getStatus()).syncInfo.latestBlockHeight;
  const block = await chainClient.getBlock(height);
  const ts = Math.floor(block.block.header.time.getTime() / 1000);
  const epoch = Math.floor(ts / 86400);
  const d = new Date(ts * 1000);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();

  const validators = await Validator.find(
    {},
    { operator_address: 1, delegator_address: 1 }
  ).lean<Array<{ operator_address: string; delegator_address?: string }>>();

  const mongoOps: Array<{
    updateOne: {
      filter: { operator_address: string; day: number; month: number; year: number };
      update: { $set: Record<string, unknown> };
      upsert: true;
    };
  }> = [];
  const skipped: DailyStatsResult['skipped'] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < validators.length) {
      const v = validators[cursor++];
      if (!v.delegator_address) {
        skipped.push({ operator_address: v.operator_address, reason: 'no delegator_address' });
        continue;
      }
      try {
        // total_stake: any failure here is a real problem — skip the validator.
        const totalRes = await chainClient.lcdGet<LcdValidatorResponse>(
          `/cosmos/staking/v1beta1/validators/${v.operator_address}`,
          { height }
        );
        const total_stake = BigInt(totalRes.validator.tokens);

        // self_stake: a 404 means the delegator fully undelegated — the
        // Delegation object is DELETED (not zeroed) by the Cosmos SDK once
        // shares hit 0. That's a valid "self_stake = 0" signal, not a failure.
        // Any OTHER error (5xx, timeout) is a real failure -> skip like above.
        let self_stake: bigint;
        try {
          const selfRes = await chainClient.lcdGet<LcdDelegationResponse>(
            `/cosmos/staking/v1beta1/validators/${v.operator_address}/delegations/${v.delegator_address}`,
            { height }
          );
          self_stake = BigInt(selfRes.delegation_response.balance.amount);
        } catch (err) {
          if (err instanceof HttpError && err.status === 404) {
            self_stake = 0n;
          } else {
            throw err;
          }
        }

        const seed = readSeedTotals(v.operator_address);

        upsertValidatorState({
          epoch,
          operator: v.operator_address,
          self_stake,
          total_stake,
          block_height: height,
          ts,
        });

        mongoOps.push({
          updateOne: {
            filter: { operator_address: v.operator_address, day, month, year },
            update: {
              $set: {
                operator_address: v.operator_address,
                timestamp: ts,
                day,
                month,
                year,
                block_height: height,
                self_stake: self_stake.toString(),
                total_stake: total_stake.toString(),
                total_withdrawn_reward: seed.reward.toString(),
                total_withdrawn_commission: seed.commission.toString(),
              },
            },
            upsert: true,
          },
        });
      } catch (err) {
        // A validator can be fully removed from the staking module (not just
        // zero-staked) and 404 forever — skip it this cycle, don't fail the job.
        skipped.push({
          operator_address: v.operator_address,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      await new Promise((r) => setTimeout(r, LCD_DELAY_MS));
    }
  }

  await Promise.all(Array.from({ length: LCD_CONCURRENCY }, worker));

  if (mongoOps.length > 0) {
    await ValidatorStats.bulkWrite(mongoOps, { ordered: false });
  }

  return {
    height,
    epoch,
    attempted: validators.length,
    succeeded: mongoOps.length,
    skipped,
  };
}
