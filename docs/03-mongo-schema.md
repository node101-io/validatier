# docs/03-mongo-schema.md — MongoDB Collections (final)

Conventions: cosmoshub-only (no `chain_identifier`). uatom = `String` (BigInt string).
timestamps = `Number` (unix sec). Model files: `models/<Name>/<Name>.ts` + `functions/`.

6 collections: `validators`, `validator_stats`, `fund_flow_edges`,
`fund_flow_sink_registry`, `prices`, `meta`.
(No `chains` → config in `.env`. No `activevalidators` → active set queried live. No `caches` → deferred.)

---

## validators — identity
```
{
  operator_address: String,     // unique, index — cosmosvaloper1... (CANONICAL KEY)
  delegator_address: String,    // unique, sparse, index — account/default withdraw (cosmos1...)
  moniker: String,              // index
  website: String,              // optional
  description: String,          // optional
  security_contact: String,     // optional
  commission_rate: String,      // decimal string "0.05..."
  keybase_id: String,           // default ""
  temporary_image_uri: String,  // optional
  created_at: Date
}
// index: {operator_address} unique, {delegator_address} unique+sparse, {moniker}
// NOTE: no `pubkey` field. Validators are identified by operator_address (a consensus
//       pubkey can be reused across validators, so it is not a stable identity).
```

## validator_stats — daily stake SNAPSHOT (for stake graphs)
```
{
  operator_address: String,     // index
  timestamp: Number,            // unix sec of the snapshot
  day: Number, month: Number, year: Number,
  block_height: Number,         // height the snapshot was taken at

  self_stake: String,           // ABSOLUTE snapshot — /staking .../delegations/{self}.balance
  total_stake: String,          // ABSOLUTE snapshot — /staking validator.tokens

  total_withdrawn_reward: String,     // CUMULATIVE to date — from SQLite seed (fund-flow)
  total_withdrawn_commission: String  // CUMULATIVE to date — from SQLite seed (fund-flow)
}
// index: {operator_address, timestamp}, {timestamp, operator_address}
// Pure snapshots: NO deltas, NO prefix_sum (absolute values need no summing; interval change
//   = difference of two snapshots). Slashing is reflected automatically in the balance.
// total_withdrawn_* are cumulative counters but still snapshot-semantics (interval = diff of
//   two rows). Source = SQLite `seed` (fund-flow pipeline), written by the daily stats job,
//   as-of the block-scan cursor. sold% denominator = total_withdrawn_reward +
//   total_withdrawn_commission. Outstanding reward/commission is intentionally not tracked
//   (only withdrawn money matters).
```

## fund_flow_edges — versioned graph
```
{
  version: Number,                 // snapshot version
  published: Boolean,              // true = version complete & readable (commit switch)

  origin: String,                  // operator_address (source validator)
  holder: String,                  // address currently holding the money
  depth: Number,                   // origin -> holder hop count

  weight: String,                  // uatom BigInt-string — current balance on this edge
  weight_prefix_sum: String,       // cumulative flow through this edge (interval queries)

  status: String,                  // in_flight | realized | suspected
  sink_tier: Number,               // null | 1 | 2
  sink_kind: String,               // null | cex | dex | ibc_out | structural

  first_seen_height: Number,   first_seen_timestamp: Number,
  last_update_height: Number,  last_update_timestamp: Number
}
// index:
//   {version, origin, holder} unique
//   {version, origin, last_update_timestamp}   -> per-validator interval
//   {version, holder}                          -> Tier 2 in-degree
//   {version, status}
//   {published, version:-1}                    -> latest published version
// NOTE (deferred): rollback will need per-version {version, snapshot_height, published}.
//   For now just write version + published; don't build rollback yet.
```

## fund_flow_sink_registry — sink addresses (Tier 1 static + Tier 2 discovered)
```
{
  address: String,                 // unique
  tier: Number,                    // 1 | 2
  kind: String,                    // cex | dex | ibc_out | structural | validator
  label: String,                   // optional — "Binance hot wallet"
  source: String,                  // static | heuristic
  discovered_at_height: Number     // null (static) | discovery height
}
// index: {address} unique, {tier}
// NOTE: `validator` kind = a validator's own wallet, explicitly curated onto the
//   Tier 1 list (business decision — see docs/01 classify step). Money reaching
//   it is `realized`, same as any other Tier 1 sink.
```

## prices — ATOM/USD history
```
{
  timestamp: Number,   // unix sec
  day: Number, month: Number, year: Number,
  price: Number        // ATOM/USD rate (a rate, not base units -> Number is fine)
}
// index: {timestamp}
```

## meta — single doc: cursor + version pointer + totals
```
{
  scanned_up_to_height: Number,          // block-scan cursor
  scanned_up_to_time: Number,
  fund_flow_current_version: Number,     // published version pointer
  fund_flow_edge_count: Number,
  fund_flow_totals: {                    // uatom BigInt-strings (from SUM over edges)
    in_flight: String, realized: String, suspected: String
  },
  is_genesis_saved: Boolean,
  updated_at: Date
}
// single document.
```

---

## Derived (not stored) — computed at snapshot/read time

```
sold_realized(origin)  = Σ fund_flow_edges.weight where origin, status=realized
sold_suspected(origin) = Σ ...                                 status=suspected
withdrawn(origin)      = total_withdrawn_reward + total_withdrawn_commission
                         (latest validator_stats row — see validator_stats above)
sold%(origin)          = sold_realized / withdrawn
```
