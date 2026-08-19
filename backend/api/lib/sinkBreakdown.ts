import { uatomToAtom } from './amounts'
import type { SinkSaleDoc } from './sinkSales'

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
export function normalizeSinkLabel(label: string | null | undefined): string {
  if (!label) return 'Unknown'

  let name = label
    .replace(/\s*\[conf:[^\]]*\]\s*$/, '') // trailing " [conf:medium]"
    .replace(/^cex\s*\/\s*/i, '') // leading "cex / "
    .replace(/^cex-/i, '') // leading "cex-"
    .replace(/\([^)]*\)/g, '') // any "(...)" suffix
    .replace(/#\d+/g, '') // any "#18" token
    .replace(/\s+/g, ' ')
    .trim()

  return name.length > 0 ? name : 'Unknown'
}

// All_time sold per exchange: for each (operator, sink) pair, take its latest
// cumulative_sold (same "latest per pair" rule as latestCumulativeByPair),
// then group those pair totals by normalized exchange name. Sorted by sold
// desc; zero-amount entries dropped.
export function buildSinkBreakdown(
  sales: ReadonlyArray<SinkSaleWithOperator>,
  labelByAddress: ReadonlyMap<string, string | null | undefined>,
  decimals: number,
): SinkBreakdownEntry[] {
  const latestByPair = new Map<string, { address: string; timestamp: number; value: bigint }>()
  for (const doc of sales) {
    const key = `${doc.operator_address}:${doc.sink_address}`
    const existing = latestByPair.get(key)
    if (!existing || doc.timestamp > existing.timestamp) {
      latestByPair.set(key, {
        address: doc.sink_address,
        timestamp: doc.timestamp,
        value: BigInt(doc.cumulative_sold),
      })
    }
  }

  const totalsByName = new Map<string, bigint>()
  for (const entry of latestByPair.values()) {
    const name = normalizeSinkLabel(labelByAddress.get(entry.address))
    totalsByName.set(name, (totalsByName.get(name) ?? 0n) + entry.value)
  }

  const result: SinkBreakdownEntry[] = []
  for (const [name, total] of totalsByName) {
    if (total <= 0n) continue
    result.push({ name, sold: uatomToAtom(total, decimals) })
  }

  result.sort((a, b) => b.sold - a.sold)
  return result
}
