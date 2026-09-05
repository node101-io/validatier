// Generic "value as-of a given timestamp" lookup over a sorted time series —
// shared by statsSeries (price/sold-as-of-day) and aggregate (network price grid).

export interface TimedValue<T> {
  timestamp: number
  value: T
}

// series MUST be sorted ascending by timestamp. Returns the value of the last
// entry at-or-before ts, or null if no entry is <= ts.
export function valueAtOrBefore<T>(
  series: ReadonlyArray<TimedValue<T>>,
  ts: number,
): T | null {
  let lo = 0
  let hi = series.length - 1
  let answer: T | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (series[mid].timestamp <= ts) {
      answer = series[mid].value
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return answer
}
