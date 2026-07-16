import type { Database, Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';
import { MODULE_ACCOUNTS } from '../chain/moduleAccounts';
import { operatorsFor } from '../store/withdrawMap';
import type { RealTransfer } from '../chain/blockResults';

// Seed inflow (docs/01 step 1, docs/04 SEED hot-path): a reward/commission
// claim paid out by the distribution module into a validator withdraw address.
// The origin is the withdraw event's `validator` attribute — exact attribution,
// no pro-rata even for commingled wallets. Credits `seed` and opens the depth-1
// in_flight edge in ONE transaction. NO edge to the distribution module.

export interface BlockCtx {
  height: number;
  ts: number; // unix seconds (block time)
}

interface SeedParams {
  origin: string;
  holder: string;
  reward: bigint;
  commission: bigint;
  amount: bigint;
  height: number;
  ts: number;
}

interface Stmts {
  applySeed: (p: SeedParams) => void;
}

let stmts: Stmts | null = null;

function s(): Stmts {
  if (stmts) return stmts;
  const db: Database = getSqlite();

  const seedUpsert: Statement = db.prepare(`
    INSERT INTO seed (origin, reward_withdrawn, commission_withdrawn, last_height, last_ts)
    VALUES (@origin, @reward, @commission, @height, @ts)
    ON CONFLICT(origin) DO UPDATE SET
      reward_withdrawn     = reward_withdrawn + excluded.reward_withdrawn,
      commission_withdrawn = commission_withdrawn + excluded.commission_withdrawn,
      last_height = excluded.last_height,
      last_ts     = excluded.last_ts`);

  const edgeUpsert: Statement = db.prepare(`
    INSERT INTO edges (origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
                       first_height, first_ts, last_height, last_ts)
    VALUES (@origin, @holder, @amount, 1, 'in_flight', NULL, @amount, @height, @ts, @height, @ts)
    ON CONFLICT(origin, holder) DO UPDATE SET
      weight            = weight + excluded.weight,
      weight_prefix_sum = weight_prefix_sum + excluded.weight_prefix_sum,
      last_height = excluded.last_height,
      last_ts     = excluded.last_ts`);

  stmts = {
    // credit + edge must land together or not at all (weight-conservation)
    applySeed: db.transaction((p: SeedParams) => {
      seedUpsert.run(p);
      edgeUpsert.run(p);
    }) as (p: SeedParams) => void,
  };
  return stmts;
}

// Returns true when the transfer was consumed as seed inflow. False = not a
// seed (caller's module-account exclusion in 6.2 will drop distribution noise).
export function processSeedTransfer(t: RealTransfer, ctx: BlockCtx): boolean {
  if (t.sender !== MODULE_ACCOUNTS.distribution) return false;
  const tag = t.withdraw_tag;
  if (!tag) return false; // e.g. community-pool spend — not a claim

  // Guard: the named validator must actually withdraw to this address.
  // Otherwise the wallet claimed rewards it earned as a DELEGATOR to some
  // other validator — that is not this validator's income, not seed.
  if (!operatorsFor(t.recipient).includes(tag.validator)) return false;

  s().applySeed({
    origin: tag.validator,
    holder: t.recipient,
    reward: tag.kind === 'reward' ? t.amount : 0n,
    commission: tag.kind === 'commission' ? t.amount : 0n,
    amount: t.amount,
    height: ctx.height,
    ts: ctx.ts,
  });
  return true;
}
