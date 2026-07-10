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

- [ ] **0.2 `.env` + config loader.** Load DENOM, DECIMALS, BECH32_PREFIX, RPC_URLS, LCD_URLS,
      MONGO_URI, SQLITE_PATH, MAX_DEPTH, TIER2_MIN_INDEGREE. → `.env.example`, CLAUDE.md
      *Accept:* typed `config` object; missing required var throws at startup.

## Phase 1 — Connections

- [ ] **1.1 MongoDB connection** (mongoose). → CLAUDE.md
      *Accept:* connects using MONGO_URI; logs success; clean shutdown.

- [ ] **1.2 SQLite connection + PRAGMAs + schema init.** Open `better-sqlite3`, set WAL /
      synchronous=NORMAL / temp_store=MEMORY / `defaultSafeIntegers(true)`, create all tables +
      indexes if not exist. → `docs/04-sqlite-working-store.md`
      *Accept:* db file created with all 6 tables + partial index `idx_edges_holder`; BigInt mode on.

## Phase 2 — Mongoose models

- [ ] **2.1 Validator model** (operator_address canonical, no pubkey, delegator_address sparse).
      → `docs/03-mongo-schema.md`
- [ ] **2.2 ValidatorStats model** (snapshot fields + cumulative
      `total_withdrawn_reward|commission`; no prefix_sum/deltas). → `docs/03`
- [ ] **2.3 FundFlowEdge model** (version, published, origin/holder, weight String, indexes). → `docs/03`
- [ ] **2.4 FundFlowSinkRegistry model.** → `docs/03`
- [ ] **2.5 Price model.** → `docs/03`
- [ ] **2.6 Meta model** (single doc). → `docs/03`
      *Accept (each):* schema matches doc exactly (field names, types, indexes); no chain fields.

## Phase 3 — Chain utilities (pure, unit-testable)

- [ ] **3.1 bech32 + address helpers.** `operatorToAccount(operator)` (cosmosvaloper→cosmos, same
      bytes). → `docs/02-data-sources.md`
      *Accept:* `operatorToAccount` round-trips a known validator to its account (verify against a
      real pair, e.g. `cosmosvaloper10sjr8x...` → `cosmos10sjr8x...`).

- [ ] **3.2 Module account set.** `moduleAddress(name)` + build MODULE_ACCOUNTS at startup.
      → `docs/02`
      *Accept:* derived fee_collector == `cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta`,
      distribution == `cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl` (unit test).

## Phase 4 — Block fetching + parsing

- [ ] **4.1 RPC/LCD client** with registry-sourced URL pool + round-robin + retry.
      Support `x-cosmos-block-height` header on LCD calls. → `docs/02`
      *Accept:* fetches `/status`, `/block_results?height`, `/block?height`.

- [ ] **4.2 block_results parser.** Given a `/block_results` response, return the list of REAL
      transfers `{sender, recipient, amount: bigint, msg_index, source: tx|finalize}` applying ALL
      rules: only `transfer` events; require `msg_index` in txs_results; skip fee/tip (no msg_index);
      split multisend per recipient; ignore accrual events in finalize_block_events; uatom-only; skip
      empty. Also surface `withdraw_rewards`/`withdraw_commission` tags per msg_index. → `docs/02`
      *Accept:* unit test on the sample block (the one with a 1-uatom MsgSend + 625/198 fee/tip) yields
      exactly the 1-uatom transfer as real, fee/tip skipped; distribution→X transfers tagged.

## Phase 5 — Origin set

- [ ] **5.1 Validator ingest.** From `create_validator` (and genesis), upsert `validators`
      (operator_address, delegator_address=derived account, moniker, commission, etc.).
      → `docs/03`, `docs/02`
      *Accept:* validators populated with operator_address unique.

- [ ] **5.2 withdraw_map build.** Seed default = `operatorToAccount(operator)` for every validator;
      apply `set_withdraw_address` events as overrides (delete old (op,addr), insert new).
      → `docs/01`, `docs/04`
      *Accept:* `withdraw_map` returns the correct current withdraw address per operator; a commingled
      address maps to multiple operators (array).

## Phase 6 — Taint engine (the core; build incrementally, test each)

- [ ] **6.1 Seed inflow.** On `distribution → withdrawAddr` transfer: resolve origins via
      withdraw_map (pro-rata if commingled), credit `seed.reward|commission` (by tag), open depth-1
      `in_flight` edge. NO edge to distribution. → `docs/01`, `docs/04`
      *Accept:* seeding a reward claim credits seed + creates one edge; commingled splits pro-rata.

- [ ] **6.2 Module-account exclusion + taint check.** Skip transfers touching module accounts
      (except the seed case); `isTainted(sender)` via the partial index. → `docs/01`, `docs/02`
      *Accept:* fee/module transfers skipped; taint check O(1) via `idx_edges_holder`.

- [ ] **6.3 Haircut + contraction (ONE transaction).** For a tainted sender, split amount pro-rata
      across origins, reduce origin→sender, increase origin→receiver, depth=min(existing, sender+1),
      delete zeroed edges. → `docs/01`, `docs/04`
      *Accept:* weight-conservation invariant holds after contraction (`Σ weight per origin` unchanged
      except by what reached a sink); remainder distributed deterministically; all in a txn.

- [ ] **6.4 Classify + sink_registry.** Load static Tier 1 list into `sink_registry` at startup
      (mock list for now — real list comes later). On each receiver: Tier 1 (list, or IBC-out via
      same-msg_index `ibc_transfer`/`send_packet` event) → `realized` (terminal); Tier 2 structural
      (single signal: in-degree ≥ TIER2_MIN_INDEGREE) → `suspected`; else stays in_flight. → `docs/01`
      *Accept:* realized edges drop out of the partial index (no longer tainted); Tier 2 stays and is
      flagged separately.

- [ ] **6.5 Termination.** Inflow-exhaustion (edge weight 0 → delete/close) and MAX_DEPTH
      (open edge but don't propagate). → `docs/01`
      *Accept:* branches terminate; no unbounded traversal.

## Phase 7 — Snapshot to Mongo

- [ ] **7.1 Snapshot job.** Pause ingest at height H; write all SQLite edges to `fund_flow_edges`
      (version=N, published=false, compute weight_prefix_sum); write meta totals + per-origin
      sold/withdrawn; flip published=true; bump meta version. → `docs/01`, `docs/03`
      *Accept:* dashboard-readable snapshot exists; partial (mid-write) snapshot never visible
      (published gate); totals = SUM over edges.

## Phase 8 — validator_stats (separate daily job)

- [ ] **8.1 Daily stake snapshot.** Once/day at the day's height, for each validator query
      total_stake + self_stake (staking REST, height header), read cumulative
      total_withdrawn_reward/commission from SQLite `seed`, and upsert `validator_stats` + SQLite
      `validator_state` (epoch). → `docs/02`, `docs/03`, `docs/04`
      *Accept:* one absolute snapshot per validator per day incl. withdrawn cumulatives; no
      deltas/prefix_sum; slashing reflected.

## Phase 9 — Prices

- [ ] **9.1 Price sync.** Fetch ATOM/USD history (CoinGecko) into `prices`. → `docs/03`
      *Accept:* daily price rows; used later for USD display.

## Phase 10 — Orchestration

- [ ] **10.1 Main block loop.** Advance from `meta.scanned_up_to_height`; for each block: fetch →
      parse → run taint engine → advance cursor. Round-robin RPCs, handle failures. → `docs/01`
      *Accept:* processes a range of blocks end-to-end, cursor persists, restart resumes.

- [ ] **10.2 Schedulers.** Daily: fund-flow snapshot job FIRST, then validator_stats job
      (denominator height ≥ numerator height → sold% never exceeds 100%), plus price sync.
      → CLAUDE.md
      *Accept:* jobs run on schedule in the correct order without blocking the block loop.

---

## Deferred (do NOT start without explicit go-ahead)
- Versioning/rollback machinery (epoch↔version sync, restore from version). Use plain
  incrementing version + published for now.
- Dashboard read layer / cache.
- Own archive node + historical backfill (`tx_search`). Public RPC + forward-only for now.
- Tier 2 threshold tuning (start with conservative defaults; refine with real data).
