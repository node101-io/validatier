# docs/05-frontend-data-layer.md — Dashboard HTTP API contract

Backend serves this data live from Mongo via a small HTTP API
(`backend/api/server.ts`), computed by `backend/api/dashboard.ts` (`loadDashboard`,
60s TTL in-memory cache) using pure aggregation helpers in `backend/api/lib/*`. The
frontend fetches it during SSR only (`frontend/src/server/api.ts` — Node-to-Node
fetch, never exposed to the browser) — no static export, no direct Mongo access from
the frontend. `all_time` only; no interval/date filtering (yet — see "Future: time
interval" below).

All uatom BigInt-strings from Mongo are converted to **ATOM `number`** before leaving
the backend (`uatomToAtom`, see `docs/03-mongo-schema.md` conventions). The frontend
never sees a uatom string or does its own division by `10**decimals`.

Conversion reference: `viz/data.py` (`uatom_to_atom`, `load_validator_summary`,
`load_sink_sales`, `_flatten_validator_stats`) — the Python dashboard computes the same
numbers today; API output was checked against it during development.

---

## Endpoints

```
GET /api/meta
GET /api/summary
GET /api/validators
GET /api/validators/:operatorAddress/summary   (404 if unknown or total_withdraw == 0)
GET /api/validators/:operatorAddress/series    (200 with [] if the validator has no rows)
```

The validator detail page fetches `summary` and `series` as two separate requests
deliberately: `summary` is cheap and decides the 404 before the response starts
streaming; `series` (the graph data) is deferred and streamed in after
(`routes/validator.$operatorAddress.tsx`, TanStack Router's `<Await>`).

---

## Shared building blocks

### Validator row (used in `GET /api/validators` and embedded in `GET /api/validators/:operatorAddress/summary`)

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
  leading_exchange: string | null;      // this validator's top entry in its own sinkBreakdown (normalized exchange name); null if it has no sink sales in the window
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

### Monthly bucket (used in `GET /api/summary` and `GET /api/validators/:operatorAddress/series`)

Every time series in this export — network-wide or per-validator — is stored **bucketed by
year/month, one bucket per `validator_stats`-shaped month**, never as a flat array. This is
deliberate: the network only grows (more months, more validators), flat arrays would need
re-slicing on every request and make network vs. per-validator series look inconsistent side
by side. One shape everywhere keeps the frontend's reading code identical for both endpoints.

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
have data for that scope (network-wide for `/api/summary`, this validator for
`/api/validators/:operatorAddress/series`) — no synthetic empty months, no padding to a fixed window.

---

## `GET /api/meta`

```ts
{
  generated_at: number;            // unix sec, time this snapshot was computed
  scanned_up_to_height: number;    // from Mongo `meta` singleton
  fund_flow_version: number;       // from Mongo `meta.fund_flow_current_version`
  price: number;                   // latest ATOM/USD from `prices`, 0 if none
}
```

## `GET /api/summary`

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
  sinkBreakdown: SinkBreakdownEntry[]; // all_time, every validator_sink_sale network-wide, grouped by exchange name and sorted sold desc
}

type SinkBreakdownEntry = {
  name: string;   // fund_flow_sink_registry label normalized to the exchange name (address-specific
                   // suffixes like "#18 (Staking)" stripped — see backend/api/lib/sinkBreakdown.ts);
                   // "Unknown" for a sink address with no registry label
  sold: number;    // ATOM, Σ latest cumulative_sold across every address belonging to that exchange
};
```

Within each bucket, `data.timestamp`/`total_stake`/`total_sold`/`price` stay aligned by index
(day-1) — same rule as the monthly bucket definition above. The frontend derives its x-axis
from these `timestamp` values directly (replacing the old array-length/index derivation in
`graph-metrics.tsx:293-334`, which assumed one flat array per series).

## `GET /api/validators`

```ts
{
  validators: ValidatorRow[];   // all_time, total_withdraw > 0, no fixed sort order guaranteed —
                                  // frontend table/leaderboards sort client-side as they do today
}
```

## `GET /api/validators/:operatorAddress/summary`

404 if `operatorAddress` isn't bech32-shaped, unknown, or excluded (`total_withdraw == 0`
— same filter as `/api/validators`).

```ts
{
  validator: ValidatorRow & {
    description: string | null;
    security_contact: string | null;
    delegator_address: string | null;
    commission_rate: string;        // raw decimal string, kept for display formatting
  };
  metrics: Metric[];                 // this validator's own average stake / sold — NOT the network-wide metrics above
  ranks: {
    percentageSoldRank: number;     // 1-based, among included (total_withdraw>0) validators
    totalValidators: number;        // count of included validators
  };
  sinkBreakdown: SinkBreakdownEntry[]; // all_time, THIS validator's own validator_sink_sales only — same shape as summary.sinkBreakdown
}
```

No `selfStakeRank` (no self-stake data). No `ranks.selfStakeRank`.

## `GET /api/validators/:operatorAddress/series`

`MonthlyBucket[]` — same shape as `summary.stats` above, but `data.total_stake` /
`total_sold` / `price` are THIS validator's own values, not network sums. Returns `[]`
for an address that would 404 on `/summary` too; the frontend only calls this after
`/summary` already succeeded, so it never needs to distinguish "empty" from "not found"
here.

**Per-validator date range varies and is NOT padded to a fixed window.** Validators are
created (and start being indexed) at different heights, so one validator's `validator_stats`
history can span close to a year while another (created recently) has only a few weeks —
confirmed against the live DB: as of this writing, populated-day counts per validator range
from 5 to 19 days across 632 validators, all bounded by how long the indexer has run plus
each validator's own creation date.

---

## Explicitly removed (no longer produced anywhere)

`pubkey`, `chain_identifier`, `usd_exchange_rate` (chain-level; use `meta.price` /
`summary.metrics[price]` instead), `self_stake`, `initial_self_stake_prefix_sum`,
`average_self_stake_ratio`, `smallSelfStakeAmountGraphData`, `smallSelfStakeRatioGraphData`,
`cummulativeActiveSet`.

---

## Time interval (`?range=&until=`)

All four endpoints above accept two optional query params, resolved by
`backend/api/lib/dateRange.ts`:

- `range` — one of `last_3_months` | `last_6_months` | `last_year` | `all_time`. Missing or
  unrecognized → `all_time`.
- `until` — `YYYY-MM-DD`, the inclusive end of the window (end-of-day UTC). Missing,
  malformed, or out of `[2021-02-18, today]` → clamped to today.

The two combine into `[from, to]`: `all_time` sets `from` to cosmoshub-4 genesis
(2021-02-18); the month-based presets subtract that many *calendar* months from `until`
(not a fixed day count), clamped to genesis on the low end. `to` is always `until`.

Every number in the response shapes above is computed against this window — the shapes
themselves are unchanged (`SummaryJson`, `ValidatorSummaryJson`, `MonthlyBucket`,
`SinkBreakdownEntry` all stay exactly as documented above). The interval formula is
`docs/03-mongo-schema.md`'s: `valueAt(t) = last doc with timestamp <= t, else 0`;
`delta(t1,t2) = valueAt(t2) - valueAt(t1)`. Concretely: `total_withdraw`,
`sinkBreakdown[].sold`, `MonthlyBucket.data.total_sold`, and `average_total_stake` are all
windowed to `[from, to]`; the `price` metric averages only `prices` docs inside the window
(point-in-time chart prices were already `valueAt`-correct and are unaffected).

No params at all → identical to the all-time behavior before this was added (`range`
defaults to `all_time`, `until` defaults to today).

Example: `GET /api/summary?range=last_3_months&until=2026-08-01`.
