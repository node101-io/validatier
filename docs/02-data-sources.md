# docs/02-data-sources.md — Endpoints, Parsing, Address/Module Derivation

## Endpoints

Two APIs, exactly two URLs (fixed in `.env`): **CometBFT RPC** (`RPC_URL` — blocks/events/tx)
and **Cosmos LCD** (`LCD_URL` — `/cosmos/...` state).
All LCD state queries accept the `x-cosmos-block-height` header for historical reads (needs
an **archive node**; public nodes are pruned — measured on the current endpoints:
`block_results` reaches back ~100k blocks ≈ 1 week).

### Fund-flow ingest (per block)

| Need | Endpoint | Type |
|---|---|---|
| latest height (cursor) | `/status` | RPC |
| **block events (transfers)** | `/block_results?height=N` | RPC — the backbone |
| block timestamp | `/block?height=N` → `.block.header.time` | RPC |

### validator_stats (daily snapshot job)

`{op}` = operator_address (`cosmosvaloper1...`), `{self}` = derived account (`cosmos1...`).

| Field | Endpoint | Extract |
|---|---|---|
| `total_stake` | `/cosmos/staking/v1beta1/validators/{op}` | `.validator.tokens` |
| `self_stake` | `/cosmos/staking/v1beta1/validators/{op}/delegations/{self}` | `.delegation_response.balance.amount` |
| current withdraw addr | `/cosmos/distribution/v1beta1/delegators/{self}/withdraw_address` | `.withdraw_address` |

All snapshot (absolute) with height header. The daily job ALSO writes
`total_withdrawn_reward` / `total_withdrawn_commission` into `validator_stats`: cumulative
values read from the SQLite `seed` table (fund-flow pipeline), NOT from these endpoints.
They are as-of the block-scan cursor, which may differ slightly from the day's height —
acceptable at daily resolution. `outstanding` reward/commission is **not tracked** (we only
care about withdrawn money).

### Validator identity / active set

| Need | Endpoint |
|---|---|
| validator list + metadata | `/cosmos/staking/v1beta1/validators` |
| **current** active (bonded) set | `/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED` |

Active set is **instantaneous only** (no history collection). Keyed by operator_address.

### Backfill / verification (later, archive node)

`/cosmos/tx/v1beta1/txs?query=...` or RPC `/tx_search`. NOT used for live ingest (live uses
`/block_results`, which is streaming and zero marginal cost). Note: `txs?query` has a known
bug that can miss some txs — use only for spot verification, always scope by height range.

---

## Parsing `/block_results`

Response has two buckets:
- `txs_results[]` — per-tx events (user transactions).
- `finalize_block_events[]` — protocol/block-level events (mint, reward distribution, ICS),
  tagged `mode: BeginBlock`.

### Rules (apply per event)

1. **Only `type == "transfer"`.** Ignore `coin_spent`, `coin_received`, `message`, `tx`, etc.
   Every value movement appears 3× (coin_spent/coin_received/transfer); `transfer` has both
   sides + amount.
2. **In `txs_results`: require a `msg_index` attribute.** Transfers WITH `msg_index` are real
   message transfers. Transfers WITHOUT `msg_index` are fee/tip (ante handler) → **skip**.
   Do NOT assume fees go to `fee_collector` — with feemarket/tip they can go to a normal address.
3. **Multisend:** one `msg_index` can have multiple `transfer` events (one per recipient) →
   emit one edge per recipient.
4. **`finalize_block_events`:** ignore non-transfer events (`rewards`, `commission`, `mint`,
   `coinbase` are accruals, NOT transfers). The per-validator begin-block `rewards`/`commission`
   events are accounting entries inside the distribution module — NOT money hitting a wallet.
5. **Denom filter:** only `uatom`. Skip empty amounts and non-uatom denoms (e.g. `ibc/...` ICS
   rewards).
6. **Amounts** parse as BigInt.

### Reward/commission tagging (for seed)

When you see `distribution → withdrawAddr` (seed inflow), look at the same `msg_index`'s
message action to tag it:
- `withdraw_rewards` event → tag `reward`
- `withdraw_commission` event → tag `commission`
One tx can withdraw both (two msg_indexes) → tag each separately.

---

## Module account derivation (compute at startup)

```ts
import { sha256 } from "@cosmjs/crypto";
import { toBech32 } from "@cosmjs/encoding";

export function moduleAddress(name: string, prefix = "cosmos"): string {
  return toBech32(prefix, sha256(new TextEncoder().encode(name)).slice(0, 20));
}

// build the set once at startup:
export const MODULE_ACCOUNTS = {
  fee_collector:          moduleAddress("fee_collector"),
  distribution:           moduleAddress("distribution"),
  mint:                   moduleAddress("mint"),
  bonded_tokens_pool:     moduleAddress("bonded_tokens_pool"),
  not_bonded_tokens_pool: moduleAddress("not_bonded_tokens_pool"),
  gov:                    moduleAddress("gov"),
  consumer_rewards_pool:  moduleAddress("consumer_rewards_pool"), // ICS
};
```

Verified correct against real cosmoshub addresses (e.g. fee_collector =
`cosmos17xpfvakm2amg962yls6f84z3kell8c5lserqta`, distribution =
`cosmos1jv65s3grqf6v6jl3dp4t6c9t9rk99cd88lyufl`).

**Usage:**
- `sender == MODULE_ACCOUNTS.distribution && recipient is a withdraw addr` → **seed inflow**.
- any other module account as sender/recipient → **exclude** (protocol noise).

---

## operator ↔ account (self / default withdraw)

```ts
import { fromBech32, toBech32 } from "@cosmjs/encoding";

// cosmosvaloper1X -> cosmos1X (same 20 bytes, different prefix)
export function operatorToAccount(operator: string): string {
  const { data } = fromBech32(operator);   // 20-byte payload
  return toBech32("cosmos", data);
}
```
This account is the self-delegator and the **default** withdraw address. Protocol-enforced
equal to operator bytes since genesis (v0.33). The **actual** withdraw address may be overridden
(`set_withdraw_address`) — resolve via `withdraw_map`.

---

## Consensus address (only if ever needed)

`/validators` RPC returns hex consensus address = `sha256(ed25519_pubkey)[:20]` uppercase hex.
This rewrite does NOT need it (active set comes from staking `?status=BOND_STATUS_BONDED` keyed
by operator_address). Documented for completeness only.
