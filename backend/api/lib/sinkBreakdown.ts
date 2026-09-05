import { uatomToAtom } from './amounts'
import type { SinkSaleDoc } from './sinkSales'
import type { ResolvedRange } from './dateRange'

// cumulative_sold is monotonic per (operator_address, sink_address) pair, not
// per sink_address alone — a network-wide call mixes docs from every
// validator, and two validators can withdraw to the same exchange deposit
// address (exchanges reuse addresses), so operator_address must be part of
// the "latest" key or one validator's total gets silently dropped.
export interface SinkSaleWithOperator extends SinkSaleDoc {
  operator_address: string
}

// docs/05 "Exchange Sales" section — same numbers as latestCumulativeByPair
// (sinkSales.ts) but keyed by human exchange name instead of summed into one
// scalar. One exchange (Upbit, Binance, ...) owns several sink addresses in
// defined_accounts.csv, so this groups by normalized label, not by address.
export interface SinkBreakdownEntry {
  name: string
  sold: number // ATOM
}

// Strips the address-specific noise from a fund_flow_sink_registry label so
// every address belonging to the same exchange collapses to one name.
// Examples (see defined_accounts.csv): "Upbit #18 (Staking)" -> "Upbit",
// "Binance #03 (Withdraw)" -> "Binance", "cex / Bybit Reserves 68" -> "Bybit
// Reserves 68", "cex-cosmoshub-3" -> "cosmoshub-3".
//
// `kind` disambiguates the fallback when there's no registry label: an
// ibc_out sink is a known terminal (money left the chain via IBC), not an
// unidentified exchange, so it gets its own bucket instead of "Unknown" —
// "Unknown" is reserved for a cex/dex sink address that isn't in the
// curated registry yet (genuinely unidentified).
export function normalizeSinkLabel(
  label: string | null | undefined,
  kind?: 'cex' | 'dex' | 'ibc_out',
): string {
  if (!label) return kind === 'ibc_out' ? 'IBC Transfers' : 'Unknown'

  let name = label
    .replace(/\s*\[conf:[^\]]*\]\s*$/, '') // trailing " [conf:medium]"
    .replace(/^cex\s*\/\s*/i, '') // leading "cex / "
    .replace(/^cex-/i, '') // leading "cex-"
    .replace(/\([^)]*\)/g, '') // any "(...)" suffix
    .replace(/#\d+/g, '') // any "#18" token
    .replace(/\s+/g, ' ')
    .trim()

  return name.length > 0 ? name : kind === 'ibc_out' ? 'IBC Transfers' : 'Unknown'
}

interface PairWinner {
  address: string
  kind: 'cex' | 'dex' | 'ibc_out'
  timestamp: number
  value: bigint
}

// The latest doc at-or-before `cutoff`, per (operator, sink) pair — the same
// "latest per pair" rule as latestCumulativeByPair (sinkSales.ts), just
// bounded by a timestamp instead of always taking the newest doc ever.
function latestByPairAtOrBefore(
  sales: ReadonlyArray<SinkSaleWithOperator>,
  cutoff: number,
): Map<string, PairWinner> {
  const winners = new Map<string, PairWinner>()
  for (const doc of sales) {
    if (doc.timestamp > cutoff) continue
    const key = `${doc.operator_address}:${doc.sink_address}`
    const existing = winners.get(key)
    if (!existing || doc.timestamp > existing.timestamp) {
      winners.set(key, {
        address: doc.sink_address,
        kind: doc.sink_kind,
        timestamp: doc.timestamp,
        value: BigInt(doc.cumulative_sold),
      })
    }
  }
  return winners
}

// Sold per exchange within [range.from, range.to]: for each (operator, sink)
// pair, `valueAt(pair, to) - valueAt(pair, from)` (docs/03's interval
// formula), then group those pair deltas by normalized exchange name. Sorted
// by sold desc; zero/negative-amount entries dropped. Filtering the *input*
// array to the range instead of this two-cutoff approach would be wrong per
// docs/03's sparse-by-design note: a pair whose last sale predates
// range.from must still contribute its carried-forward value at `from`, not
// silently disappear.
export function buildSinkBreakdown(
  sales: ReadonlyArray<SinkSaleWithOperator>,
  labelByAddress: ReadonlyMap<string, string | null | undefined>,
  decimals: number,
  range: ResolvedRange,
): SinkBreakdownEntry[] {
  const atTo = latestByPairAtOrBefore(sales, range.to)
  const atFrom = latestByPairAtOrBefore(sales, range.from)

  const totalsByName = new Map<string, bigint>()
  for (const [key, winner] of atTo) {
    const baseline = atFrom.get(key)?.value ?? 0n
    const delta = winner.value - baseline
    const name = normalizeSinkLabel(labelByAddress.get(winner.address), winner.kind)
    totalsByName.set(name, (totalsByName.get(name) ?? 0n) + delta)
  }

  const result: SinkBreakdownEntry[] = []
  for (const [name, total] of totalsByName) {
    if (total <= 0n) continue
    result.push({ name, sold: uatomToAtom(total, decimals) })
  }

  result.sort((a, b) => b.sold - a.sold)
  return result
}
