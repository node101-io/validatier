import { chainClient, ChainClient } from '../chain/client';
import { retryAsync } from '../chain/http';
import { fetchAllStakingValidators } from '../chain/stakingValidators';
import { getSqlite } from '../db/sqlite';
import { Validator } from '../models/Validator/Validator';
import { DAYS_PER_MONTH_ARRAY_LENGTH, ValidatorStats } from '../models/ValidatorStats/ValidatorStats';

// Daily stake snapshot (docs/02 validator_stats section, docs/04 validator_state
// table). Pure ABSOLUTE snapshots — no deltas/prefix_sum. total_withdrawn_* are
// cumulative but still snapshot-semantics (interval = diff of two rows), sourced
// from SQLite `seed` (fund-flow pipeline), NOT from these REST endpoints.

// Bulk stake fetch: one paginated LCD list call (~2 pages for 628 validators)
// instead of one call per validator. Deliberately unfiltered by status — the
// staking module's list endpoint returns bonded/unbonding/unbonded together,
// and Mongo `validators` (synced by ingest/validators.ts) holds all of them
// too, so filtering here would silently drop validator_stats rows for anyone
// currently out of the active set even though they may have withdrawn heavily
// while they were in it.
export async function fetchStakeAtHeight(
  height: number,
  client?: ChainClient
): Promise<Map<string, bigint>> {
  const validators = await fetchAllStakingValidators<{ operator_address: string; tokens: string }>({
    height,
    client,
  });
  const out = new Map<string, bigint>();
  for (const v of validators) {
    out.set(v.operator_address, BigInt(v.tokens));
  }
  return out;
}

// The old per-validator loop isolated one flaky LCD call from the rest —
// losing a single validator for a day, not the whole day. The bulk fetch
// above traded that away on purpose (one paginated call instead of ~628):
// there's no per-validator granularity left to preserve, a failed page is
// a failed fetch, period. What we CAN still do is retry the whole bulk
// fetch a few times before letting it propagate — a transient blip (one
// dropped page out of ~2) shouldn't force blockLoop.ts's day-check to redo
// the whole day's job (including re-running the fund-flow snapshot) just
// to get another attempt ~6 seconds later. Each attempt already retries
// its own HTTP calls internally (chain/http.ts's fetchJsonWithRetry, via
// ChainClient/ArchiveChainClient.lcdGet) — this is a second, coarser layer
// on top for the bulk call as a whole, built on the SAME retryAsync loop
// (a hand-rolled duplicate of it here was caught by code review).
const FETCH_STAKE_RETRY_ATTEMPTS = 3;
const FETCH_STAKE_RETRY_DELAY_MS = 1000;

export async function fetchStakeAtHeightWithRetry(
  height: number,
  client?: ChainClient
): Promise<Map<string, bigint>> {
  return retryAsync(() => fetchStakeAtHeight(height, client), {
    attempts: FETCH_STAKE_RETRY_ATTEMPTS,
    delayMs: (attempt) => FETCH_STAKE_RETRY_DELAY_MS * attempt,
    errorContext: `fetchStakeAtHeight at height ${height}`,
  });
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
  total_stake: bigint;
  block_height: number;
  ts: number;
}): void {
  getSqlite()
    .prepare(
      `INSERT INTO validator_state (epoch, operator, total_stake, block_height, ts)
       VALUES (@epoch, @operator, @total_stake, @block_height, @ts)
       ON CONFLICT(epoch, operator) DO UPDATE SET
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

type EnsureDocOp = {
  updateOne: {
    filter: { operator_address: string; year: number; month: number };
    update: { $setOnInsert: Record<string, unknown> };
    upsert: true;
  };
};
type DayWriteOp = {
  updateOne: {
    filter: { operator_address: string; year: number; month: number };
    update: { $set: Record<string, unknown> };
  };
};

function emptyMonthArray(): Array<null> {
  return Array(DAYS_PER_MONTH_ARRAY_LENGTH).fill(null);
}

// Pure — no I/O. Two separate ops are required (rather than one update) because
// MongoDB rejects a single update that mixes $setOnInsert on a whole array field
// with $set on one of that array's indices ("conflict at total_stake"). The ensure
// op is a no-op once the month's doc already exists; the day-write op sets this
// day's slot in each array.
export function buildValidatorStatsOps(input: {
  operator_address: string;
  year: number;
  month: number;
  day: number;
  ts: number;
  height: number;
  total_stake: bigint;
  reward: bigint;
  commission: bigint;
}): { ensureOp: EnsureDocOp; dayWriteOp: DayWriteOp } {
  const { operator_address, year, month, day, ts, height, total_stake, reward, commission } =
    input;
  const dayIndex = day - 1;

  return {
    ensureOp: {
      updateOne: {
        filter: { operator_address, year, month },
        update: {
          $setOnInsert: {
            operator_address,
            year,
            month,
            timestamp: emptyMonthArray(),
            block_height: emptyMonthArray(),
            total_stake: emptyMonthArray(),
            total_withdrawn_reward: emptyMonthArray(),
            total_withdrawn_commission: emptyMonthArray(),
          },
        },
        upsert: true,
      },
    },
    dayWriteOp: {
      updateOne: {
        filter: { operator_address, year, month },
        update: {
          $set: {
            [`timestamp.${dayIndex}`]: ts,
            [`block_height.${dayIndex}`]: height,
            [`total_stake.${dayIndex}`]: total_stake.toString(),
            [`total_withdrawn_reward.${dayIndex}`]: reward.toString(),
            [`total_withdrawn_commission.${dayIndex}`]: commission.toString(),
          },
        },
      },
    },
  };
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
    { operator_address: 1 }
  ).lean<Array<{ operator_address: string }>>();

  // Two bulkWrite passes across all validators (see buildValidatorStatsOps for why).
  const ensureDocOps: EnsureDocOp[] = [];
  const dayWriteOps: DayWriteOp[] = [];
  const skipped: DailyStatsResult['skipped'] = [];

  const stakeByOperator = await fetchStakeAtHeightWithRetry(height);
  if (stakeByOperator.size === 0) {
    // An empty staking module means the endpoint is broken, not that the
    // chain has no validators — fail loudly instead of skipping everyone.
    throw new Error(`staking validators list returned 0 entries at height ${height}`);
  }

  for (const v of validators) {
    const total_stake = stakeByOperator.get(v.operator_address);
    if (total_stake === undefined) {
      // A validator can be fully removed from the staking module (not just
      // zero-staked) — skip it this cycle, don't fail the job.
      skipped.push({
        operator_address: v.operator_address,
        reason: `not present in staking module at height ${height}`,
      });
      continue;
    }

    const seed = readSeedTotals(v.operator_address);

    upsertValidatorState({
      epoch,
      operator: v.operator_address,
      total_stake,
      block_height: height,
      ts,
    });

    const { ensureOp, dayWriteOp } = buildValidatorStatsOps({
      operator_address: v.operator_address,
      year,
      month,
      day,
      ts,
      height,
      total_stake,
      reward: seed.reward,
      commission: seed.commission,
    });
    ensureDocOps.push(ensureOp);
    dayWriteOps.push(dayWriteOp);
  }

  if (ensureDocOps.length > 0) {
    await ValidatorStats.bulkWrite(ensureDocOps, { ordered: false });
  }
  if (dayWriteOps.length > 0) {
    await ValidatorStats.bulkWrite(dayWriteOps, { ordered: false });
  }

  return {
    height,
    epoch,
    attempted: validators.length,
    succeeded: dayWriteOps.length,
    skipped,
  };
}
