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

## Phase 11 — R2 archive layer (replaces the old archive-node plan below; decided
## 2026-08-24, see `.claude/plans/archive-node-yerine-gerekli-luminous-zephyr.md`)

Archive node judged too expensive/slow (TB-scale disk, weeks to sync, no cosmoshub
snapshot available). Instead: an **ingester** (new `backend/archive/` code, reuses the
existing live `ChainClient`) walks the live chain once, strips `block_results` and writes
it to **local disk as the primary store**, with a zstd-compressed copy mirrored to
Cloudflare R2 as a backup (measured ~23-28 GB for the chosen 2-year window — see the plan
for the full byte-level measurement). Local-first was a later call (lead dev, 2026-08-25):
the whole archive is trivial for any server's disk, and every R2 request costs something
even though egress is free, so normal operation shouldn't touch R2 at all — R2 only gets
read when local disk is empty (a fresh server, or a wiped cache dir; see
`archive/localArchive.ts`'s header). A **wrapper** (`backend/archive/server.ts`) serves the
local copy back over plain HTTP. The dashboard backend's `chain/client.ts` `chainClient`
singleton now always points at the wrapper — it never talks to the live chain directly.
The ingester is the one process that still does; it constructs its own `ChainClient`
independent of the singleton (no `CHAIN_SOURCE` flag — see client.ts's comments for why).
Operational consequence of local-first: the ingester and the wrapper MUST share the same
disk/volume (`ARCHIVE_CACHE_DIR`) — this traded away "ingester can run from any machine
with just the R2 credentials" for the cost win, on purpose.

Scope is 2 years, not all-time: start height **21,870,000**, chosen because it's the first
height where every tx `transfer` event reliably carries `msg_index` (measured SDK v0.47
boundary between 21,830,000–21,870,000) — below it, `parseBlockResults`'s fee/tip
disambiguation (gotcha #1) would need a synthesis fallback that was deliberately rejected
(no guessing in money math, per this file's own rule). Extending further back is a future
decision, not this phase's.

- [x] **11.1 Strip rules (`archive/lib/strip.ts`) + parity test.** Drop `coin_spent`/
      `coin_received`/`update_client` events and tx `data`/`log`/`info` fields — measured
      ~73% of raw bytes, none read by the parser. `archive/strip.test.ts` runs every real
      fixture in `chain/__fixtures__/` through both the untouched and stripped shape and
      asserts `parseBlockResults`/`parseValidatorLifecycleEvents` output is byte-identical.
      *Accept:* 11/11 tests pass (done).

- [x] **11.2 `ChainSource` interface split (`chain/client.ts`) + `ArchiveChainClient`
      (`chain/archiveClient.ts`, new).** `ChainClient` now `implements ChainSource`
      unchanged in body; the `chainClient` singleton is `ArchiveChainClient` talking to
      `ARCHIVE_URL`. Shared `HttpError`/`fetchJson` pulled into `chain/http.ts` so neither
      client.ts nor archiveClient.ts has a runtime circular import on the other (a real
      load-order-dependent bug this surfaced and fixed — see `chain/archiveClient.test.ts`).
      *Accept:* all call sites (`blockLoop.ts`, `validatorStats.ts`, `stakingValidators.ts`,
      `withdrawMap.ts`, `inspectValidatorTx.ts`) unchanged; parity test (fake wrapper +
      fixtures) confirms identical parser output through the archive path (done).

- [x] **11.3 R2 client (`archive/lib/r2.ts`), chunking (`archive/lib/chunk.ts`), R2-side manifest
      primitives (`archive/lib/manifest.ts`), local-first layer (`archive/localArchive.ts`).**
      Hand-rolled SigV4 (no AWS SDK dependency) — signing logic unit-tested for
      determinism/shape, NOT against a live bucket yet. 1000-block chunks, zstd-19 for the
      R2 backup copy (measured sweet spot); local disk keeps the decompressed jsonl
      directly (no decompression cost on repeated reads). `localArchive.ts`'s
      `loadManifest`/`saveManifest`/`readChunk`/`writeChunk` are local-disk-first with R2
      as a write-through backup — `manifest.ts`/`r2.ts`'s R2 functions are no longer called
      from anywhere except `localArchive.ts`. Unit-tested against a fake in-memory R2 (fetch
      monkey-patched) asserting the actual GET-call counts: a local hit makes zero R2 calls,
      a local miss makes exactly one R2 GET and then caches it for every subsequent read.
      *Accept:* `localArchive.test.ts` (7 tests) passes; signing itself still needs a
      live-credential round-trip before first real use (blocked on Bekleyen girdiler #1).

- [x] **11.4 Ingester (`archive/ingest.ts`) + entrypoint (`npm run archive-sync`).**
      `nextChunkToIngest` (pure, unit-tested) only ever ingests a chunk once ALL its heights
      are behind the live tip — no partial trailing chunks. Concurrency via
      `archive/lib/parallelMap.ts` (measured 63 blocks/sec @ concurrency 48 against a single
      RPC in the plan's probes). Writes go through `localArchive.ts`'s `writeChunk`/
      `saveManifest` — local disk first, R2 backup second, manifest advance last.
      *Accept:* boundary-condition unit tests pass; full backfill run is blocked on real R2
      creds + a ~2-day archive RPC window (Bekleyen girdiler below) — not yet executed.

- [x] **11.5 Wrapper (`archive/server.ts`) + entrypoint (`npm run archive-server`).**
      Plain JSON over HTTP (NOT a CometBFT JSON-RPC mock — cosmjs's decoder is too strict
      about the full `/block` shape we deliberately don't store). `/status`,
      `/block_results/:height`, `/header/:height`, `/lcd/*` (live passthrough only so far —
      height-scoped LCD via archived staking snapshots is the still-open item below). Reads
      go through `localArchive.ts`'s `readChunk`/`loadManifest` — in normal operation
      (wrapper sharing `ARCHIVE_CACHE_DIR` with the ingester) every request is served off
      local disk, R2 is never touched.
      *Accept:* served correctly against fixture data in-process (`archiveClient.test.ts`);
      not yet run against a live R2 bucket or alongside a real ingester.

- [x] **11.6 Staking snapshot backfill ("Adım A").** `archive/lib/stakingDay.ts`:
      day↔height binary search (`findFirstHeightOfDay`) + day-window walk decision
      (`nextStakingDayToBackfill`), both pure/unit-tested against a fake in-memory chain
      (13 tests). `archive/localArchive.ts`: `readStakingSnapshot`/`writeStakingSnapshot`,
      one JSON object per UTC day (not chunked — a day's validator list is small), same
      local-first/R2-backup pattern as block_results (10 tests incl. R2-restore-on-miss).
      `archive/stakingIngest.ts`'s `runStakingBackfill()` walks day by day from the archive's
      startDay to the chain's current tip day (inclusive — "today" counts, unlike a partial
      block_results chunk, since a day's snapshot only needs ONE block on that day to exist).
      Wired into `entrySync.ts`, runs before each block_results ingest pass (its own
      manifest field `stakingCompleteThroughDay` tracks progress independently).

      **Serving-side decision (lead dev's explicit call, 2026-08-26, overriding the
      reviewer-recommended default):** `archive/server.ts`'s `/lcd` handler serves a day's
      staking snapshot for ANY height-scoped request landing on that UTC day (resolved via
      the archived block header), not only a request for the exact height the snapshot was
      taken at — day-approximate matching (Seçenek B), not exact-height-only (Seçenek A).
      Accepted risk: a same-day request for a height AFTER a delegation/undelegation event
      gets the EARLIER (first-of-day) stake figure. Judged acceptable because
      `validator_stats` already only takes ONE data point per day everywhere else in this
      system (`jobs/validatorStats.ts`'s `runDailyValidatorStats` is called once per day,
      at the day's first block) — the existing design's precision unit is already "a day,"
      not "a block." 7 tests in `server.test.ts` cover both the day-approximate hit and the
      fallback-to-live-passthrough misses (no header archived, header archived but no
      staking snapshot for that day, and a pagination.key second-page request, which the
      archive never serves since it always answers in one page).

      **Verified, and a real (separate, already-tracked) bug reconfirmed along the way:**
      live E2E against the real chain + real R2 (temporary test window, cleaned up after —
      see the plan's verification log) proved the day/height-finding algorithm finds the
      objectively correct heights (cross-checked against real RPC block timestamps,
      unaffected by 11.7's bug — that bug lives in the LCD, not the RPC) and that the
      wrapper's day-approximate serving does what it's designed to do. It could NOT verify
      that the archived `tokens` VALUES are historically accurate, because the current
      `LCD_URL` — independently reconfirmed live during this same test — returns byte-
      identical validator data for a height 10,000 blocks in the past as for the current
      tip, i.e. it ignores the height header entirely (this is 11.7, not a new issue).
      Real, value-accurate staking backfill is still blocked on 11.7's fix landing, exactly
      as this task already said below before 11.6 was implemented.
      *Accept:* pure logic + wiring unit-tested (30 new tests total); real historical VALUE
      accuracy blocked on 11.7.

- [ ] **11.7 LCD height-header trust bug (separate from the archive work, surfaced while
      measuring for it).** The current `LCD_URL` silently ignores
      `x-cosmos-block-height` — a request for height 20,000,000 and one for height
      99,999,999 both return today's latest state, no error. `validatorStats.ts`'s
      `fetchStakeAtHeight` has been writing today's stake into every "historical" day since
      it started using this endpoint. Being handled with devops (a correct archive LCD
      returns a `grpc-metadata-x-cosmos-block-height` response header matching the request —
      verified against `rest.cosmos.directory` when it happens to route to a real archive
      backend). Once a trustworthy LCD exists: add the header-echo check to
      `ArchiveChainClient.lcdGet`/wherever the height-scoped LCD call ends up, so a mismatch
      throws instead of silently writing wrong data — this must land before 11.6 backfills
      any staking snapshot data using height-scoped LCD calls.
      *Accept:* a height-scoped LCD call against a non-echoing endpoint throws; against a
      correct one, succeeds and the returned data actually differs by height.

## Deferred — old archive-node design (superseded by Phase 11 above, kept for history)

Design decided 2026-07-22 (user call). No longer the plan — an archive node is not being
provisioned; R2 replaces it. Left here only so the reasoning isn't lost:

- [ ] ~~`HAS_ARCHIVE_NODE` config flag + genesis-start in the SAME block loop.~~ Superseded.
- [ ] ~~Pause daily jobs while backfill is still catching up.~~ Superseded — the R2 design's
      wrapper only ever reports `latestBlockHeight` as far as the archive is actually
      filled (`archive/server.ts`'s `/status`), so the live block loop naturally can't get
      ahead of the archive in the first place; no separate pause logic needed.

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
