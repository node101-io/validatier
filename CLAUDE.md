# CLAUDE.md — Validatier Backend (fund-flow rewrite)

> This file is the entry point. Read it fully before doing anything. For any task,
> also read the specific doc under `docs/` named in `TASKS.md` for that task.
> Work **one task at a time** from `TASKS.md`; do not jump ahead.

---

## What this project is

Validatier is a Cosmos Hub (cosmoshub) dashboard that answers one question per
validator: **how much of the staking rewards they withdrew did they actually sell
(send to an exchange/DEX), vs. keep?**

The naive/old approach ("net outflow from the withdraw address = sold") produces
false positives — a validator moving funds to their own second wallet looks like a
sale. This rewrite fixes that with **multi-hop fund-flow tracing (taint tracking)**:
follow each withdrawn coin across wallets until it reaches a real market sink (CEX/
DEX/IBC-out) or the trail ends.

**Scope: cosmoshub ONLY.** No multi-chain. No `chain_identifier` fields anywhere.

---

## Tech stack

- **Language:** TypeScript (Node). Existing repo is an Nx monorepo, Mongoose + MongoDB.
- **Persistent store:** MongoDB (via Mongoose) — final versioned data the dashboard reads.
- **Working store:** SQLite via `better-sqlite3` (synchronous). Hot mutation layer where
  the taint graph lives; periodically snapshotted to Mongo. (We evaluated LevelDB/RocksDB
  and chose SQLite — see `docs/04-sqlite-working-store.md` for why.)
- **Chain data:** CometBFT RPC (`/block_results`, `/block`, `/status`) + Cosmos LCD
  (`/cosmos/...`). Endpoint pool from the chain registry (`chains.cosmos.directory`,
  `rest.cosmos.directory`). **Archive node required** for historical state/backfill.
- **Config:** in `.env` (denom, decimals, bech32 prefix, RPC/LCD URLs). NOT a DB collection.

---

## Architecture (two pipelines, one block loop)

```
                    ┌──────────────── block scan (every block) ────────────────┐
CometBFT RPC  ─────▶│  /block_results (events) + /block (timestamp)             │
                    └──────────────────────────┬───────────────────────────────┘
                                               │ transfer events (parsed)
                        ┌──────────────────────┴───────────────────────┐
                        ▼                                               ▼
             ┌─────────────────────┐                        (validator_stats is a
             │  FUND-FLOW ENGINE    │                         SEPARATE daily job, see
             │  taint / contraction │                         below — not per-block)
             │  in SQLite (edges)   │
             └──────────┬───────────┘
                        │ periodic snapshot (versioned, published flag)
                        ▼
                   MongoDB  ──────────▶  dashboard
```

**Pipeline A — Fund-flow (per block):** parse transfers → forward taint propagation in
SQLite → periodic versioned snapshot to Mongo `fund_flow_edges`. Produces "sold".

**Pipeline B — validator_stats (daily job):** once per day, query each validator's
stake at that day's height via staking REST (`x-cosmos-block-height` header). Pure
**snapshots** (absolute values) — NO delta accumulation, NO prefix sums. Produces the
stake graphs. `self_stake`, `total_stake`. Also publishes the cumulative
`total_withdrawn_reward|commission` (read from SQLite `seed`) into `validator_stats`.

**sold%** = `fund_flow.realized / (reward_withdrawn + commission_withdrawn)`.
Both numerator and denominator ORIGINATE in fund-flow (see glossary); the denominator is
published daily into `validator_stats` as `total_withdrawn_reward|commission`.

---

## The fund-flow algorithm in one paragraph

Seed the taint set with validator withdraw addresses. When a `distribution → withdrawAddr`
transfer is seen, credit that origin's inflow (this is a reward/commission claim, the
"seed" — tag it reward or commission). When any tainted address sends money, follow it:
record an edge from the **origin validator** to the **current holder** (path contraction:
we always re-anchor to the origin, folding intermediate hops). If a wallet holds money
from multiple origins (commingled), split outgoing amounts **pro-rata** (haircut). When
money reaches a sink (static CEX/DEX list = Tier 1, or a structurally-suspicious address
= Tier 2, or IBC-out = terminal), mark the edge realized/suspected. Stop following a
branch when its inflow is exhausted or max depth is reached. Full spec:
`docs/01-architecture.md`.

---

## Collections / stores (final)

MongoDB: `validators`, `validator_stats`, `fund_flow_edges`, `fund_flow_sink_registry`,
`prices`, `meta`. (No `chains`, no `activevalidators`, no `caches` — see docs.)

SQLite (working): `edges`, `seed`, `withdraw_map`, `validator_state`, `sink_registry`,
`meta`.

Schemas: `docs/03-mongo-schema.md` and `docs/04-sqlite-working-store.md`. **Do not invent
fields** — use exactly what the schema docs specify.

---

## Conventions (follow exactly)

- **cosmoshub-only:** never add `chain_identifier` / `chain` fields or per-chain key prefixes.
- **Canonical validator key = `operator_address`** (`cosmosvaloper1...`). NOT pubkey.
  A consensus pubkey can be reused by different validators (tombstone/recreate), so pubkey
  is not a stable identity. There is no `pubkey` field on the validator model.
- **uatom amounts:**
  - In **Mongo**: store as `String` (BigInt string) — we don't do arithmetic there.
  - In **SQLite**: store as `INTEGER` and enable `better-sqlite3` BigInt mode
    (`db.defaultSafeIntegers(true)`). uatom fits int64; BigInt mode avoids float precision loss.
    Convert with `.toString()` when writing to Mongo.
  - **Never** put a uatom amount into a JS `number` (float64 loses precision > 2^53).
- **timestamps:** unix seconds as `Number`.
- **Model file convention (existing repo style):** `models/<Name>/<Name>.ts` for the schema,
  `models/<Name>/functions/<fn>.ts` for statics/helpers.
- **Async style:** prefer `async/await` for new code (the old repo was callback-heavy; we are
  modernizing). `better-sqlite3` is synchronous by design — that's fine, don't wrap it in promises.

---

## Critical gotchas (these WILL bite if ignored)

1. **Event parsing is per-`transfer`-event, not per-tx.** One tx emits multiple `transfer`
   events (fee, tip, the real send, multisend fan-out). Only events carrying a `msg_index`
   attribute are real message transfers; events WITHOUT `msg_index` are fee/tip machinery →
   **skip them**. Do NOT rely on "fee goes to fee_collector" — with feemarket/tip the fee can
   go to a normal address. See `docs/02-data-sources.md`.

2. **Ignore `coin_spent` / `coin_received` events.** Every value movement appears 3× (coin_spent,
   coin_received, transfer). Use **only `transfer`** (it has sender+recipient+amount).

3. **Module accounts are derived, not fetched.** `module_address = bech32("cosmos",
   sha256(module_name)[:20])`. Compute at startup for: `fee_collector`, `distribution`, `mint`,
   `bonded_tokens_pool`, `not_bonded_tokens_pool`, `gov`, `consumer_rewards_pool`. Use them to:
   (a) treat `distribution → withdrawAddr` as **seed inflow** (credit, no edge),
   (b) **exclude** transfers to/from other module accounts (protocol noise). Code in docs.

4. **operator_address ↔ account address are the same 20 bytes** (different bech32 prefix),
   protocol-enforced since genesis (v0.33). Derive the self-delegator/default-withdraw account
   as `bech32("cosmos", bytes(operator_address))`. The **consensus** address (`cosmosvalcons`)
   is a DIFFERENT key — cannot be derived from operator.

5. **Withdraw address can differ from the derived default.** A validator may `MsgSetWithdrawAddress`
   to any wallet. Origin-set = derived default OVERRIDDEN by `set_withdraw_address` events, tracked
   in `withdraw_map`. Also queryable directly via the distribution withdraw_address endpoint.

6. **SQLite reverse lookups use a partial index**, not a second table:
   `CREATE INDEX idx_edges_holder ON edges(holder) WHERE status != 'realized';`
   Marking an edge `realized` auto-removes it from taint checks (sink is terminal). Don't
   hand-maintain a reverse index.

7. **Contraction must be one SQLite transaction** (reduce origin→sender + increase origin→receiver).
   Half-applied contraction breaks the weight-conservation invariant
   (`Σ weight per origin = that origin's still-in-flight money`).

8. **Public RPC nodes are pruned** — historical `/block_results` and historical state queries
   need the **archive node**. Going-forward (recent heights) works on public; backfill needs archive.

---

## How to work here

1. Open `TASKS.md`. Find the first unchecked task.
2. Read the doc(s) that task references under `docs/`.
3. Implement just that task. Keep it small and correct.
4. If a decision is ambiguous or missing from the docs, STOP and ask — do not guess about
   money math, address handling, or event semantics.
5. Mark the task done, then move to the next. One at a time.

### Deliberately deferred (do NOT build yet)
- Versioning/rollback details (epoch↔version sync) — parked. Use a simple incrementing `version`
  for `fund_flow_edges` and `published` flag; don't build rollback machinery yet.
- Dashboard read layer / cache design — deferred.
- Own archive node ops — using public RPC first; backfill comes after the node is up.

---

## Doc index

- `docs/00-glossary.md` — terms: origin/holder, taint, in_flight/realized/suspected, the address types.
- `docs/01-architecture.md` — full fund-flow algorithm + sequence + termination + haircut math.
- `docs/02-data-sources.md` — endpoints, block_results parsing rules, module-account derivation, address code.
- `docs/03-mongo-schema.md` — all Mongo collections (exact fields + indexes).
- `docs/04-sqlite-working-store.md` — SQLite tables, indexes, hot-path SQL, transactions.
- `TASKS.md` — the ordered implementation plan.
