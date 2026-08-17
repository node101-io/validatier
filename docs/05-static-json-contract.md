# docs/05-static-json-contract.md — Static JSON export contract

Backend produces these files once (via `backend/export/exportJson.ts`), the frontend
reads them as static assets — no live API. `all_time` only; no interval/date filtering.

All uatom BigInt-strings from Mongo are converted to **ATOM `number`** at export time
(`uatomToAtom`, see `docs/03-mongo-schema.md` conventions). The frontend never sees a
uatom string or does its own division by `10**decimals`.

Conversion reference: `viz/data.py` (`uatom_to_atom`, `load_validator_summary`,
`load_sink_sales`, `_flatten_validator_stats`) — the Python dashboard computes the same
numbers today; export output is checked against it (see plan doc, step A4).

---

## File layout

```
data/
  meta.json
  summary.json
  validators.json
  validator/<operator_address>.json     (one file per validator with total_withdraw > 0)
```

---

## Shared building blocks

### Validator row (used in `validators.json` and embedded in `validator/<addr>.json`)

```ts
{
  moniker: string;
  temporary_image_uri: string | null;   // null -> frontend falls back to default avatar asset
  operator_address: string;
  website: string | null;               // null/empty -> frontend must not render the website link
  commission: number;                   // percent, 0-100 (commission_rate * 100)
  average_total_stake: number;          // ATOM, mean of populated total_stake days
  total_withdraw: number;               // ATOM, reward + commission withdrawn, all_time
  sold: number;                         // ATOM, Σ latest cumulative_sold across all sink pairs for this validator
  percentage_sold: number;              // sold / total_withdraw * 100, clamped [0,100]
}
```

Row is included ONLY if `total_withdraw > 0` (validators with zero withdrawn activity are
dropped entirely — same filter as `viz/data.py:load_validator_summary`).

No `id`, no `pubkey`, no `chain_identifier`, no `self_stake`, no
`initial_self_stake_prefix_sum`, no `reward` (commission-only reward split is not tracked
by the new backend — `total_withdraw` is the combined reward+commission figure).

### Metric

```ts
{
  id: "total_stake_sum" | "total_sold" | "price";
  color: string;    // fixed: "#FF9404" | "#5856D7" | "#31ADE6" respectively
  title: string;    // fixed: "Average Delegation" | "Total Sold Amount" | "Average ATOM Price"
  valueNative: number;   // ATOM (or USD/ATOM rate for "price")
}
```

Exactly 3 metrics, always in this order, ids/colors/titles fixed (existing frontend
components key off these).

### Monthly bucket (used in `summary.json` and `validator/<addr>.json`)

Every time series in this export — network-wide or per-validator — is stored **bucketed by
year/month, one bucket per `validator_stats`-shaped month**, never as a flat array. This is
deliberate: the network only grows (more months, more validators), flat arrays would need
re-slicing on every export and make network vs. per-validator series look inconsistent side
by side. One shape everywhere keeps the frontend's reading code identical for both files.

```ts
{
  year: number;
  month: number;                    // 1-12
  data: {
    timestamp: (number | null)[];   // length 31, index = day-1, unix sec, null if that day is unset
    total_stake: (number | null)[]; // ATOM, length 31, index = day-1, null if unset
    total_sold: (number | null)[];  // ATOM, length 31, index = day-1, cumulative sold as-of that day, null if timestamp[i] is null
    price: (number | null)[];       // ATOM/USD, length 31, index = day-1, from `prices` at/before timestamp[i], null if timestamp[i] is null
  };
}
```

Array of buckets is sorted `(year, month)` ascending and contains ONLY months that actually
have data for that scope (network-wide for `summary.json`, this validator for
`validator/<addr>.json`) — no synthetic empty months, no padding to a fixed window.

---

## `meta.json`

```ts
{
  generated_at: number;            // unix sec, export run time
  scanned_up_to_height: number;    // from Mongo `meta` singleton
  fund_flow_version: number;       // from Mongo `meta.fund_flow_current_version`
  price: number;                   // latest ATOM/USD from `prices`, 0 if none
}
```

## `summary.json`

```ts
{
  summaryData: {
    total_stake_sum: number;       // ATOM, Σ average_total_stake over included validators
    total_withdraw_sum: number;    // ATOM, Σ total_withdraw over included validators
    total_sold: number;            // ATOM, Σ sold over included validators
    percentage_sold: number;       // total_sold / total_withdraw_sum * 100, clamped [0,100]
  };
  metrics: Metric[];                // total_stake_sum -> total_stake_sum (avg), total_sold -> total_sold, price -> price average over prices series
  stats: MonthlyBucket[];           // network-wide: data.total_stake = daily Σ total_stake across all validators, data.total_sold = daily Σ cumulative_sold across all validators, data.price = network daily ATOM/USD (not summed)
}
```

Within each bucket, `data.timestamp`/`total_stake`/`total_sold`/`price` stay aligned by index
(day-1) — same rule as the monthly bucket definition above. The frontend derives its x-axis
from these `timestamp` values directly (replacing the old array-length/index derivation in
`graph-metrics.tsx:293-334`, which assumed one flat array per series).

## `validators.json`

```ts
{
  validators: ValidatorRow[];   // all_time, total_withdraw > 0, no fixed sort order guaranteed —
                                  // frontend table/leaderboards sort client-side as they do today
}
```

## `validator/<operator_address>.json`

One file per validator row in `validators.json`, filename = `operator_address` (URL-safe,
`cosmosvaloper1...`, no encoding needed).

**Per-validator date range varies and is NOT padded to a fixed window.** Validators are
created (and start being indexed) at different heights, so one validator's `validator_stats`
history can span close to a year while another (created recently) has only a few weeks —
confirmed against the live DB: as of this writing, populated-day counts per validator range
from 5 to 19 days across 632 validators, all bounded by how long the indexer has run plus
each validator's own creation date.

Graph data uses the same `MonthlyBucket` shape as `summary.json` (see above) — one bucket
per `validator_stats` document this validator actually has:

```ts
{
  validator: ValidatorRow & {
    description: string | null;
    security_contact: string | null;
    delegator_address: string | null;
    commission_rate: string;        // raw decimal string, kept for display formatting
  };
  metrics: Metric[];
  stats: MonthlyBucket[];           // per-validator: data.total_stake / total_sold / price are THIS validator's own values, not network sums
  ranks: {
    percentageSoldRank: number;     // 1-based, among included (total_withdraw>0) validators
    totalValidators: number;        // count of included validators
  };
}
```

No `selfStakeRank` (no self-stake data). No `ranks.selfStakeRank`.

---

## Explicitly removed (no longer produced anywhere)

`pubkey`, `chain_identifier`, `usd_exchange_rate` (chain-level; use `meta.json.price` /
`summary.json.metrics[price]` instead), `self_stake`, `initial_self_stake_prefix_sum`,
`average_self_stake_ratio`, `smallSelfStakeAmountGraphData`, `smallSelfStakeRatioGraphData`,
`cummulativeActiveSet`, per-interval variants (`last_30/90/180/365_days`, custom range) —
everything is `all_time` only.
