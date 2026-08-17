# TASKS.md — Implementation Plan (do one at a time, top to bottom)

Rules: complete tasks in order. Each task lists the doc(s) to read first and its
acceptance criteria. Check the box when done. If anything about money math, address
handling, or event semantics is unclear, STOP and ask — do not guess.

Legend: `[ ]` todo · `[x]` done · `→` doc to read

---

## Phase 0 — Project setup

- [x] **0.1 Scaffold the backend package.** TypeScript + Node, matching the existing repo's
      `models/<Name>/<Name>.ts` + `functions/` convention. Add deps: `mongoose`,
      `better-sqlite3`, `@cosmjs/crypto`, `@cosmjs/encoding`, `dotenv`, `node-cron` (or existing
      scheduler), `typescript`, types. → CLAUDE.md
      *Accept:* project builds (`tsc` clean), empty entrypoint `app.ts` runs.

- [x] **0.2 `.env` + config loader.** Load DENOM, DECIMALS, BECH32_PREFIX, RPC_URL, LCD_URL,
      MONGO_URI, SQLITE_PATH, MAX_DEPTH, TIER2_MIN_INDEGREE. → `.env.example`, CLAUDE.md
      *Accept:* typed `config` object; missing required var throws at startup.

## Phase 1 — Connections

- [x] **1.1 MongoDB connection** (mongoose). → CLAUDE.md
      *Accept:* connects using MONGO_URI; logs success; clean shutdown.

- [x] **1.2 SQLite connection + PRAGMAs + schema init.** Open `better-sqlite3`, set WAL /
      synchronous=NORMAL / temp_store=MEMORY / `defaultSafeIntegers(true)`, create all tables +
      indexes if not exist. → `docs/04-sqlite-working-store.md`
      *Accept:* db file created with all 6 tables + partial index `idx_edges_holder`; BigInt mode on.

## Phase 2 — Mongoose models

- [x] **2.1 Validator model** (operator_address canonical, no pubkey, delegator_address sparse).
      → `docs/03-mongo-schema.md`
- [x] **2.2 ValidatorStats model** (snapshot fields + cumulative
      `total_withdrawn_reward|commission`; no prefix_sum/deltas). → `docs/03`
- [x] **2.3 FundFlowEdge model** (version, published, origin/holder, weight String, indexes). → `docs/03`
- [x] **2.4 FundFlowSinkRegistry model.** → `docs/03`
- [x] **2.5 Price model.** → `docs/03`
- [x] **2.6 Meta model** (single doc). → `docs/03`
      *Accept (each):* schema matches doc exactly (field names, types, indexes); no chain fields.

## Phase 3 — Chain utilities (pure, unit-testable)

- [x] **3.1 bech32 + address helpers.** `operatorToAccount(operator)` (cosmosvaloper→cosmos, same
      bytes). → `docs/02-data-sources.md`
      *Accept:* `operatorToAccount` round-trips a known validator to its account (verify against a
      real pair, e.g. `cosmosvaloper10sjr8x...` → `cosmos10sjr8x...`).

- [x] **3.2 Module account set.** `moduleAddress(name)` + build MODULE_ACCOUNTS at startup.
      → `docs/02`
      *Accept:* derived fee_collector == `cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta`,
      distribution == `cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl` (unit test).

## Phase 4 — Block fetching + parsing

- [x] **4.1 RPC/LCD client** — exactly two URLs from `.env` (RPC_URL + LCD_URL), retry with
      backoff. Support `x-cosmos-block-height` header on LCD calls. → `docs/02`
      *Accept:* fetches `/status`, `/block_results?height`, `/block?height`.

- [x] **4.2 block_results parser.** Given a `/block_results` response, return the list of REAL
      transfers `{sender, recipient, amount: bigint, msg_index, source: tx|finalize}` applying ALL
      rules: only `transfer` events; require `msg_index` in txs_results; skip fee/tip (no msg_index);
      split multisend per recipient; ignore accrual events in finalize_block_events; uatom-only; skip
      empty. Also surface `withdraw_rewards`/`withdraw_commission` tags per msg_index. → `docs/02`
      *Accept:* unit tests on real captured blocks (`chain/__fixtures__/block_32055430.json`: fee/tip +
      ibc-denom all skipped; `block_32055440.json`: 3 real sends kept, distribution→X tagged `reward`,
      fees skipped) + synthetic edge cases (multisend, failed tx, multi-coin, zero/empty).

## Phase 5 — Origin set

- [x] **5.1 Validator ingest.** From `create_validator` (and genesis), upsert `validators`
      (operator_address, delegator_address=derived account, moniker, commission, etc.).
      → `docs/03`, `docs/02`
      *Accept:* validators populated with operator_address unique.

- [x] **5.2 withdraw_map build.** Seed default = `operatorToAccount(operator)` for every validator;
      apply `set_withdraw_address` events as overrides (delete old (op,addr), insert new).
      → `docs/01`, `docs/04`
      *Accept:* `withdraw_map` returns the correct current withdraw address per operator; a commingled
      address maps to multiple operators (array).

## Phase 6 — Taint engine (the core; build incrementally, test each)

- [x] **6.1 Seed inflow.** On `distribution → withdrawAddr` transfer: origin = the withdraw
      event's `validator` attribute (guard: must map to the recipient in withdraw_map; claims the
      wallet earned as a delegator to OTHER validators are NOT seed). Credit
      `seed.reward|commission` (by tag), open depth-1 `in_flight` edge. NO edge to distribution.
      No pro-rata at seed — every claim names its validator. → `docs/01`, `docs/04`
      *Accept:* seeding a reward claim credits seed + creates one edge; a commingled wallet's
      claim credits exactly the named validator.

- [x] **6.2 Module-account exclusion + taint check.** Skip transfers touching module accounts
      (except the seed case); `isTainted(sender)` via the partial index. → `docs/01`, `docs/02`
      *Accept:* fee/module transfers skipped; taint check O(1) via `idx_edges_holder`.

- [x] **6.3 Haircut + contraction (ONE transaction).** For a tainted sender, split amount pro-rata
      across origins, reduce origin→sender, increase origin→receiver, depth=min(existing, sender+1),
      delete zeroed edges. → `docs/01`, `docs/04`
      *Accept:* weight-conservation invariant holds after contraction (`Σ weight per origin` unchanged
      except by what reached a sink); rounding dust ignored (stays on sender, lead dev call); all in a txn.

- [x] **6.4 Classify + sink_registry.** Load static Tier 1 list into `sink_registry` at startup
      (mock list for now — real list comes later). On each receiver: Tier 1 (list, or IBC-out via
      same-msg_index `ibc_transfer`/`send_packet` event) → `realized` (terminal); Tier 2 structural
      (single signal: in-degree ≥ TIER2_MIN_INDEGREE) → `suspected`; else stays in_flight. → `docs/01`
      *Accept:* realized edges drop out of the partial index (no longer tainted); Tier 2 stays and is
      flagged separately.

- [x] **6.5 Termination.** Inflow-exhaustion (edge weight 0 → delete/close) and MAX_DEPTH
      (open edge but don't propagate). → `docs/01`
      *Accept:* branches terminate; no unbounded traversal.

## Phase 7 — Snapshot to Mongo

- [x] **7.1 Snapshot job.** Pause ingest at height H; write all SQLite edges to `fund_flow_edges`
      (version=N, published=false, compute weight_prefix_sum); write meta totals + per-origin
      sold/withdrawn; flip published=true; bump meta version. → `docs/01`, `docs/03`
      *Accept:* dashboard-readable snapshot exists; partial (mid-write) snapshot never visible
      (published gate); totals = SUM over edges.

## Phase 8 — validator_stats (separate daily job)

- [x] **8.1 Daily stake snapshot.** Once/day at the day's height, for each validator query
      total_stake (staking REST, height header), read cumulative
      total_withdrawn_reward/commission from SQLite `seed`, and upsert `validator_stats` + SQLite
      `validator_state` (epoch). → `docs/02`, `docs/03`, `docs/04`
      *Accept:* one absolute snapshot per validator per month (31-length day-indexed arrays,
      index = day-1) incl. withdrawn cumulatives; no deltas/prefix_sum; slashing reflected.

## Phase 9 — Prices

- [x] **9.1 Price sync.** Fetch ATOM/USD history (CoinGecko) into `prices`. → `docs/03`
      *Accept:* daily price rows; used later for USD display.

## Phase 10 — Orchestration

- [x] **10.1 Main block loop.** Advance from `meta.scanned_up_to_height`; for each block: fetch →
      parse → run taint engine → advance cursor, all in ONE SQLite transaction per height (crash
      mid-height rolls back cleanly, never double-applies). First-ever run starts at the current
      tip (forward-only; pruned nodes can't serve genesis). On persistent fetch failure, throw and
      stop (never skip/guess) — caller/scheduler decides when to retry. → `docs/01`
      *Accept:* processes a range of blocks end-to-end, cursor persists, restart resumes cleanly
      (verified live: two runs, second starts exactly at first's `to + 1`).

- [x] **10.1b Live validator lifecycle events** (follow-up to 5.1/5.2's one-time LCD pulls — a gap
      flagged during 10.1: a brand-new validator's first reward claim would otherwise be silently
      rejected by the seed guard since withdraw_map wouldn't know it yet). Parse `create_validator`
      (attributes: `validator`, `amount`) and `set_withdraw_address` (attribute: `withdraw_address`;
      delegator resolved from the sibling `message` event with
      action=`/cosmos.distribution.v1beta1.MsgSetWithdrawAddress` at the same msg_index — null/skip
      if unattributable, e.g. executed via an Interchain Account). Both handled per-height BEFORE
      the transfer transaction (individually idempotent — Mongo upsert / SQLite setDefault+
      applyOverride — so redoing a height on crash-retry is still safe without needing to share
      the SQLite transaction). → `docs/01`, `docs/02`
      *Accept:* event shapes verified against real chain data (create_validator via LCD tx-search,
      set_withdraw_address via a live ICA-relayed example proving the unattributable case is real,
      not hypothetical); live-tested end-to-end against real Mongo/SQLite with restore-safe checks.

- [x] **10.2 Schedulers.** Two independent timers on the same event loop: block loop every ~10s,
      daily-jobs check every ~5min (gated on "has a new UTC day started" — in-memory tracker is
      fine since every daily job is independently idempotent). Daily sequence: fund-flow snapshot
      FIRST, then validator_stats, then price sync (denominator height ≥ numerator height → sold%
      never exceeds 100%). Also wired `app.ts` end-to-end: startup now primes validators +
      withdraw_map + Tier 1 sink_registry (idempotent; task 6.4's "load at startup" requirement was
      previously unwired) before starting the scheduler, with a shutdown handler registered before
      the slow priming so Ctrl-C works even mid-startup. → CLAUDE.md
      *Accept:* jobs run in the correct order without blocking the block loop — verified live: ran
      the real `app.ts` process end-to-end (cold-start priming → scheduler → cursor genuinely
      advancing in real time → clean SIGTERM shutdown).

- [x] **10.3 Replace the two-timer scheduler with a block-time-driven recursive loop.**
      User's explicit call: get rid of the wall-clock daily-jobs poll from 10.2. Now a single
      self-rescheduling recursive loop (`jobs/scheduler.ts`) drives `runBlockLoop()` — no delay
      while there's backlog to catch up on, ~10s wait once caught up to the tip. The daily
      sequence trigger moved INSIDE `blockLoop.ts`: after each height's SQLite transaction
      commits, that height's own timestamp's UTC day is compared to the `last_daily_run_day`
      marker (now block-time-derived, not `Date.now()`); the moment they differ, the daily
      sequence (`jobs/dailyJobs.ts`, extracted from the old `tickDailyJobs`) runs inline and is
      awaited before the next height. A failed daily sequence leaves the marker unset and
      retries on the very next height (no separate timer, no polling gap). Also: `from` in
      10.1 is no longer always the tip — a fresh deploy now starts `BACKFILL_LOOKBACK_DAYS`
      (`.env`, default 7 — matches the public RPC's measured pruning depth, no archive node
      yet) behind the tip, and a restart whose cursor has fallen further behind the tip than
      that same lookback (long downtime) jumps forward the same way instead of retrying
      unfetchable pruned heights forever. `Scheduler.stop()` is now async and awaits the
      in-flight height (+ any inline daily job) before returning, so `app.ts`'s shutdown
      handler doesn't close Mongo/SQLite out from under an in-progress operation. Removed the
      unused `node-cron`/`@types/node-cron` deps (never actually imported). → CLAUDE.md
      *Accept:* `computeFromHeight`/`utcDayFromTs` unit-tested (`jobs/blockLoop.test.ts`); full
      suite green; manual smoke test confirms idle/catch-up timing, inline daily-job retry on
      failure, stale-cursor jump-forward warning, and graceful SIGTERM shutdown.

---

## Phase 11 — Archive backfill (DEFERRED — do not start until an archive node is actually
## provisioned; real chain testing against 32M+ historical blocks is required, can't be
## meaningfully validated on a pruned public node)

Design decided 2026-07-22 (user call), to be implemented once the archive node is live:

- [ ] **11.1 `HAS_ARCHIVE_NODE` config flag + genesis-start in the SAME block loop.** New required
      `.env` var (manual, same convention as `RPC_URL`/`LCD_URL` — NOT auto-detected;
      `/status`'s `earliest_block_height` is known-unreliable, see task 4.1 findings). In
      `blockLoop.ts`, when `cursor.height === 0` (never scanned): if `HAS_ARCHIVE_NODE=true`,
      `from = 1` (genesis) instead of `from = latest`. Deliberately the SAME sequential per-height
      loop as live scanning (user's explicit choice over a separate parallel-fetch pipeline) — same
      crash-safety/resumability guarantees apply unchanged. Accepted tradeoff: at current
      sequential throughput this will take a long time (weeks-scale on 32M+ blocks) — that's fine,
      it's a one-time background catch-up, not a latency-sensitive path. → `docs/01`, `docs/02`
      *Accept:* with the flag true and RPC_URL/LCD_URL pointed at a real archive node, a fresh
      (cursor=0) run starts at height 1, not the tip; with the flag false (or omitted on a
      pre-existing deployment), behavior is byte-for-byte unchanged from today (starts at tip).
      NOTE (user's explicit concern, already satisfied — no new work needed): mid-backfill crash
      recovery comes FOR FREE from task 10.1's existing per-height atomic transaction + cursor
      mechanism (already proven live: nested-transaction rollback test, and two-consecutive-runs
      resuming at exactly `to + 1`). Backfill is just the SAME loop starting from height 1 instead
      of the tip — a crash at height 15,000,000 leaves the cursor at the last fully-committed
      height, and the next run resumes from there, no special-casing required. `to` is also
      recomputed fresh on every `runBlockLoop()` call (every scheduler tick), so backfill
      self-corrects as the live tip keeps moving during the weeks it takes to catch up.

- [ ] **11.2 Pause daily jobs while backfill is still catching up.** User's explicit call: snapshot
      / validator_stats / price sync must NOT run while the cursor is still far behind the chain
      tip (avoid snapshotting/publishing partial-history data mid-backfill). Add an "is caught up"
      check (e.g. cursor within some small delta of the current tip — normal live operation is
      always within one `runBlockLoop()` call of the tip, so a threshold like a few hundred blocks
      cleanly distinguishes "still backfilling" from "live") and gate the inline daily-jobs
      trigger in `blockLoop.ts` on it (post-10.3: the trigger moved from `scheduler.ts`'s
      `tickDailyJobs()` into `blockLoop.ts`'s per-height day-check, see task 10.3). Once caught
      up, daily jobs resume automatically (no separate flag to flip back) — matches the deferred
      rollback/versioning items in not needing new persisted state, only a threshold comparison
      against data we already have (cursor vs. tip). → CLAUDE.md
      *Accept:* while `HAS_ARCHIVE_NODE=true` and cursor is far behind tip, daily jobs are skipped
      (logged, not silently dropped); once cursor catches up to near-tip, they resume on the next
      height.

---

## Phase 12 — Per-sink sold breakdown

- [x] **12.1 `ValidatorSinkSale` model + daily job.** New sparse collection
      `validator_sink_sales`: one doc per (operator_address, sink_address) PER CHANGE, not
      per day — inserted only when the SQLite `edges.weight_prefix_sum` for that
      `(origin, holder)` realized pair actually changed since the last stored entry. No
      zero-delta entries, no fixed-length arrays. Enables t1-t2 interval queries (total sold
      and per-exchange sold) via "latest entry at-or-before t1" minus "latest entry
      at-or-before t2". Written inline from the daily fund-flow snapshot job
      (`snapshotFundFlowToMongo`, reusing the SQLite `edges` rows — status='realized' —
      already read for that run), in the same Mongo transaction as the `fund_flow_edges`
      write, not as a separate job. → `docs/03-mongo-schema.md`
      *Accept:* unchanged pairs produce zero writes on a re-run; a changed pair produces
      exactly one new (append-only) doc; two origins selling to the same sink track
      independent cumulatives.

## Deferred (do NOT start without explicit go-ahead)
- Versioning/rollback machinery (epoch↔version sync, restore from version). Use plain
  incrementing version + published for now.
- Dashboard read layer / cache.
- Archive node backfill: design decided, see Phase 11 above — deferred until the node exists.
- Tier 2 threshold tuning (start with conservative defaults; refine with real data).
