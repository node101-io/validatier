# docs/01-architecture.md — Fund-Flow Algorithm

Read `00-glossary.md` first for terms. This doc is the algorithm spec.

## Data flow

```
CometBFT /block_results (events) + /block (time)
   │  parse (see 02-data-sources.md): keep real `transfer` events only
   ▼
Taint engine (operates on SQLite `edges` + `seed` + `withdraw_map`)
   │  periodic snapshot (versioned, published flag)
   ▼
MongoDB fund_flow_edges + meta  ──▶  dashboard
```

The block loop is a single forward scan over heights. It ALSO drives the daily
`validator_stats` snapshot job indirectly (that job runs once per day at the day's height;
it is a separate concern — see 02/03 docs — and does NOT go through the taint engine).

## State (SQLite working store)

See `04-sqlite-working-store.md` for exact DDL. Conceptually:
- `edges(origin, holder, weight, depth, status, sink_kind, ...)` — the graph.
- `seed(origin, reward_withdrawn, commission_withdrawn)` — cumulative claims per origin.
- `withdraw_map(withdraw_address, operator_address)` — origin-set (many-to-one supported).
- `sink_registry(address, tier, kind)` — Tier 1 static + Tier 2 discovered.

## Seeding the taint set

Origins = validator withdraw addresses. Built from:
1. **default:** for each validator, `bech32("cosmos", bytes(operator))` (see 02 doc).
2. **override:** each `MsgSetWithdrawAddress` updates `withdraw_map`.

## Per-transfer processing (the core loop)

For each REAL transfer event `(sender, recipient, amount)` (uatom only; parsing rules in 02):

```
1. SEED?  if sender == distribution module AND recipient is a validator withdraw address:
     V = `validator` attribute of the withdraw_rewards|withdraw_commission event
         at the SAME msg_index (the chain names the exact validator per claim)
     if V not in withdraw_map[recipient]:
        skip   # the wallet claimed rewards it earned as a DELEGATOR to another
               # validator -> not this validator's income, not seed
     seed[V].reward|commission += amount          # tag = event type
     edge(V, recipient).weight += amount; depth = 1; status = in_flight
     # NOTE: no edge to the distribution module. This is inflow, not a hop.
     # NOTE: commingled wallets need NO split — every claim names its validator.
     CLASSIFY recipient (step 5, below) — a validator can withdraw DIRECTLY to
        a known sink (no further hop to trigger classification otherwise);
        skip steps 2..4 (exclude/taint/contraction do not apply to seed)
     continue

2. EXCLUDE?  if sender or recipient is a module account (other than the seed case above):
     skip (protocol noise)

3. TAINTED?  if sender is NOT tainted (no non-realized edge with holder == sender):
     skip (not reachable from any validator)

4. CONTRACTION (sender is tainted):  # one SQLite transaction
     holders = edges where holder == sender AND status != realized  # {origin: weight}
     split `amount` across those origins pro-rata (haircut; deterministic remainder)
     for each origin with pay_i:
        edge(origin, sender).weight   -= pay_i     # delete if <= 0
        edge(origin, recipient).weight += pay_i
        edge(origin, recipient).depth  = min(existing, sender_depth + 1)

5. CLASSIFY recipient:
     if recipient in sink_registry tier 1  (or transfer is IBC-out):
        edge(*, recipient).status = realized; sink_kind = cex|dex|ibc_out   # terminal
     elif recipient matches structural heuristic (Tier 2):
        edge(*, recipient).status = suspected; sink_kind = structural       # keep following
     else:
        recipient becomes tainted implicitly (it now has an in_flight edge)

6. TERMINATION:
     - inflow exhausted: if an origin's weight at a holder hits 0, that branch closes (edge deleted).
     - max depth: if new depth >= MAX_DEPTH, open the edge but do not propagate further from it.
```

### Haircut (pro-rata split) math

Wallet holds from origins A=100, B=50 (total 150). 30 leaves:
```
A gets 100/150 * 30 = 20
B gets  50/150 * 30 = 10
```
Use integer (BigInt) math, floored. The rounding dust — at most (n-1) uatom per transfer —
is deliberately IGNORED (lead dev decision): it stays on the sender's edges, so weight
conservation still holds exactly and sold% errs on the conservative side. If dust ever
becomes a problem, switch to 100x fixed-point internally (100 units = 1 uatom).

### Structural sink heuristic (Tier 2)

Single signal (cheap in SQLite from the edges table):
- **high in-degree:** `COUNT(DISTINCT origin) WHERE holder = X` at or above the
  `TIER2_MIN_INDEGREE` threshold (money from many different validators pooling at one
  address = likely exchange/omnibus).
Flagged addresses stay `suspected` and are reviewed manually later. Tier 2 is never
merged into the Tier 1 `realized` total.

### IBC-out = terminal

If a transfer is an IBC send, treat it as Tier 1 `realized` with `sink_kind = ibc_out`. We
only track cosmoshub, so money leaving the chain is a terminal exit.
**Detection:** a transfer is IBC-out when the SAME `msg_index` also carries an
`ibc_transfer` / `send_packet` event. (The recipient is then the channel's escrow address —
the event is the signal; we do NOT maintain an escrow-address list.)

## Snapshot to Mongo

Periodically (frequency deferred; start daily):
1. pause ingest at height H (consistent snapshot).
2. write all SQLite `edges` to Mongo `fund_flow_edges` with `version = N`, `published = false`,
   computing `weight_prefix_sum`.
3. write `meta` totals (`SUM(weight) GROUP BY status`). Per-origin withdrawn totals are NOT
   written here — the daily stats job publishes them into `validator_stats`
   (`total_withdrawn_reward|commission`, read from SQLite `seed`).
4. flip `published = true` (commit switch) and bump `meta.fund_flow_version`.

Dashboard always reads the max `published` version. (Rollback machinery deferred.)

## Derived dashboard numbers

```
sold_realized(origin)  = Σ realized weight for origin
sold_suspected(origin) = Σ suspected weight for origin
withdrawn(origin)      = total_withdrawn_reward + total_withdrawn_commission
                         (latest validator_stats row; cumulative, sourced from SQLite seed)
sold%(origin)          = sold_realized / withdrawn
```
Stake graphs come from `validator_stats` (separate daily snapshot job). Cumulative
reward/commission (if the dashboard shows it) = withdrawn; outstanding was dropped — we
only care about withdrawn money.
Daily job ORDER matters: run the fund-flow snapshot FIRST, then the stats job — the
denominator is then at a height ≥ the numerator's, so sold% can never exceed 100%.

## Sequence diagram

A PlantUML sequence diagram of this flow is in `docs/fund-flow-sequence.puml` (render with
plantuml). It shows: seed → ingest loop → contraction → classify → termination → versioning
→ read path.
