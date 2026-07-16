# docs/00-glossary.md — Terms & Concepts

## Address types (Cosmos)

A validator has **three separate identities**, distinguished by bech32 prefix:

| Identity | Format | What it is | Derivable? |
|---|---|---|---|
| **operator address** | `cosmosvaloper1...` | staking identity; **canonical key** everywhere | — |
| **account address** | `cosmos1...` | the self-delegator wallet; **same 20 bytes** as operator, different prefix | yes: `bech32("cosmos", bytes(operator))` |
| **consensus address** | `cosmosvalcons1...` / hex | block-signing identity, from a separate ed25519 key | **no** (different key) |

- operator ↔ account: **protocol-enforced equal bytes** since genesis (v0.33). The
  CreateValidator handler self-delegates from `sdk.AccAddress(valAddr)` — no separate delegator.
- The `/validators` RPC endpoint returns the **consensus** address (hex) — not operator.
  Consensus → operator is a lookup, not a derivation (we don't need it in this rewrite).

## withdraw address

Where a validator's claimed rewards actually land (spendable). NOT a distinct address type —
it's just an account address designated to receive rewards.
- **Default** = the derived account (`cosmos1...` from operator).
- **Overridable** via `MsgSetWithdrawAddress` → any wallet.
- Tracked in `withdraw_map` (default + overrides). Also directly queryable:
  `/cosmos/distribution/v1beta1/delegators/{selfAddr}/withdraw_address`.

## Fund-flow graph terms

- **origin** — the source validator (operator_address). Taint starts here.
- **holder** — the address currently holding tainted money. An edge is `(origin, holder)`.
- **taint / taint tracking** — marking withdrawn reward money and following where it goes.
  A "tainted" address is one currently holding money traceable back to a validator.
- **path contraction** — instead of storing `A→B→C`, we store `origin→C` directly and reduce
  `origin→B`, folding intermediate hops. The graph is always `origin → current holder`.
- **haircut (pro-rata split)** — when one wallet holds money from multiple origins, outgoing
  amounts are split across origins in proportion to their share. Order-independent.
- **depth** — hop count from origin to holder (for the max-depth termination limit).
- **weight** — uatom currently attributed to an `(origin, holder)` edge.
- **weight conservation invariant** — for one origin, `Σ weight over all its edges` =
  that origin's money still in flight (withdrawn but not yet reached a sink).

## The three money states (per edge)

Every withdrawn uatom is in exactly one state:

| state | meaning | terminal? |
|---|---|---|
| `in_flight` | in a wallet, hasn't reached a market | no (keep following) |
| `realized`  | reached a known CEX/DEX (Tier 1) or left via IBC-out — **definitely sold** | yes |
| `suspected` | reached a structurally-sink-like address not on the static list (Tier 2) — **maybe sold** | no (keep following, but flagged) |

Invariant: `in_flight + realized + suspected = total withdrawn (seed inflow)`.

## Sink classification (two tiers)

- **Tier 1 (high confidence):** address is in the static CEX/DEX list, OR the transfer is an
  IBC-out (money leaves the chain — terminal since we only track cosmoshub). → `realized`.
- **Tier 2 (suspected):** address is NOT on the list but has **high in-degree** — money
  flowing in from many distinct origins (single signal; threshold `TIER2_MIN_INDEGREE`).
  → `suspected`. Kept separate so the headline "sold" number stays defensible; suspected
  addresses are reviewed manually later.

## Seed inflow

The money entering the traceable system: a `distribution → withdrawAddr` transfer (a reward
or commission **claim**). We **credit** the origin's inflow and open a depth-1 edge; we do NOT
draw an edge back to the distribution module (it's not a wallet-to-wallet hop). Tagged
`reward` or `commission` based on the accompanying `withdraw_rewards` / `withdraw_commission`
event in the same tx. The **origin** is that event's `validator` attribute — exact
attribution, so commingled wallets need no split; claims the wallet earned as a delegator
to OTHER validators are not seed.

- `reward_withdrawn + commission_withdrawn` per origin = the **denominator** of sold%
  (published daily into `validator_stats` as `total_withdrawn_reward|commission`).
- `realized` weight per origin = the **numerator**.

## Module accounts

Protocol-owned accounts (not user wallets). Addresses are **derived**, not fetched:
`bech32("cosmos", sha256(module_name)[:20])`. Relevant names: `fee_collector`, `distribution`,
`mint`, `bonded_tokens_pool`, `not_bonded_tokens_pool`, `gov`, `consumer_rewards_pool`.
Used to identify seed inflow (`distribution → withdrawAddr`) and to exclude protocol noise.

## Epoch vs Version (parked)

- **epoch** — day index (`floor(ts/86400)`), used to key daily `validator_state` snapshots
  (enables cheap per-day rollback).
- **version** — incrementing snapshot number for `fund_flow_edges`.
- These are two different counters (NOT equal). Sync/rollback details are **deferred** — for
  now just use a simple incrementing `version` + `published` flag; don't build rollback yet.
