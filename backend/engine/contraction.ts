import type { Database, Statement } from 'better-sqlite3';
import { getSqlite } from '../db/sqlite';
import { config } from '../config';
import type { BlockCtx } from './seed';

// Contraction + haircut (docs/01 step 4, docs/04 CONTRACTION hot-path).
// A tainted sender moved `amount`: split it pro-rata across the origins whose
// money the sender holds, reduce origin->sender, increase origin->recipient —
// all inside ONE transaction (half-applied contraction breaks the
// weight-conservation invariant: Σ weight per origin == money still in flight).
//
// Termination (docs/01 step 6):
//  - inflow exhausted: handled below (deleteZeroed) — a zeroed edge is dropped.
//  - MAX_DEPTH: an origin's edge already AT max depth is excluded from the
//    haircut source (see selectHolders) — its money stays parked at that
//    holder forever, even if the wallet keeps moving OTHER origins' money.
//    Termination is per (origin, holder) edge, not per wallet.

interface HolderEdge {
  origin: string;
  weight: bigint;
  depth: bigint;
}

export interface ContractionResult {
  moved: bigint; // tainted uatom actually moved (≤ transfer amount)
  origins: number; // how many origins were touched
}

interface Stmts {
  run: (sender: string, recipient: string, amount: bigint, ctx: BlockCtx) => ContractionResult;
}

let stmts: Stmts | null = null;

// pay_i = weight_i * effective / total, floored (BigInt). Rounding dust —
// at most (n-1) uatom per transfer — is deliberately IGNORED (lead dev call):
// it simply stays on the sender's edges, so conservation still holds and
// sold% errs on the conservative side. If it ever matters, switch to 100x
// fixed-point internally (100 = 1 uatom).
export function splitProRata(
  holders: ReadonlyArray<{ origin: string; weight: bigint }>,
  effective: bigint
): Map<string, bigint> {
  const total = holders.reduce((acc, h) => acc + h.weight, 0n);
  const pays = new Map<string, bigint>();
  for (const h of holders) {
    pays.set(h.origin, (h.weight * effective) / total);
  }
  return pays;
}

function s(): Stmts {
  if (stmts) return stmts;
  const db: Database = getSqlite();

  // depth < MAX_DEPTH: an edge already at the cap is frozen — excluded from
  // future haircuts, so money never propagates past it (docs/01 termination).
  const selectHolders: Statement = db.prepare(
    `SELECT origin, weight, depth FROM edges
     WHERE holder = ? AND status != 'realized' AND depth < ${config.maxDepth}`
  );
  const reduce: Statement = db.prepare(`
    UPDATE edges SET weight = weight - @pay, last_height = @height, last_ts = @ts
    WHERE origin = @origin AND holder = @sender`);
  const deleteZeroed: Statement = db.prepare(
    'DELETE FROM edges WHERE origin = @origin AND holder = @sender AND weight <= 0'
  );
  const upsertReceiver: Statement = db.prepare(`
    INSERT INTO edges (origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
                       first_height, first_ts, last_height, last_ts)
    VALUES (@origin, @recipient, @pay, @depth, 'in_flight', NULL, @pay, @height, @ts, @height, @ts)
    ON CONFLICT(origin, holder) DO UPDATE SET
      weight            = weight + excluded.weight,
      weight_prefix_sum = weight_prefix_sum + excluded.weight_prefix_sum,
      depth             = MIN(depth, excluded.depth),
      last_height = excluded.last_height,
      last_ts     = excluded.last_ts`);

  stmts = {
    run: db.transaction(
      (sender: string, recipient: string, amount: bigint, ctx: BlockCtx): ContractionResult => {
        const holders = selectHolders.all(sender) as HolderEdge[];
        if (holders.length === 0) return { moved: 0n, origins: 0 };

        const total = holders.reduce((acc, h) => acc + h.weight, 0n);
        // The wallet may hold UNTRACKED money too and send more than we trace:
        // only the tracked part can move, or weights would go negative.
        const effective = amount < total ? amount : total;
        const pays = splitProRata(holders, effective);

        let origins = 0;
        let moved = 0n; // Σ floor pays — may be < effective (ignored dust)
        for (const h of holders) {
          const pay = pays.get(h.origin)!;
          if (pay === 0n) continue; // too small a share to receive a single uatom
          origins++;
          moved += pay;
          const base = { origin: h.origin, sender, pay, height: ctx.height, ts: ctx.ts };
          reduce.run(base);
          deleteZeroed.run(base); // inflow exhausted -> branch closes
          upsertReceiver.run({
            origin: h.origin,
            recipient,
            pay,
            depth: h.depth + 1n, // receiver keeps MIN(existing, this) via upsert
            height: ctx.height,
            ts: ctx.ts,
          });
        }
        return { moved, origins };
      }
    ) as Stmts['run'],
  };
  return stmts;
}

export function applyContraction(
  sender: string,
  recipient: string,
  amount: bigint,
  ctx: BlockCtx
): ContractionResult {
  // self-transfer moves nothing between wallets — the graph must not change
  if (sender === recipient) return { moved: 0n, origins: 0 };
  return s().run(sender, recipient, amount, ctx);
}
