// Resolves the frontend's "data of [preset] until [day]" selector into an
// absolute [from, to] unix-second window. Every aggregation function in this
// directory takes a ResolvedRange now — all_time is just the widest possible
// window (genesis..now), not a special case, so callers never branch on it.

export type RangePreset = 'last_3_months' | 'last_6_months' | 'last_year' | 'all_time'

export interface ResolvedRange {
  from: number // unix seconds, inclusive
  to: number // unix seconds, inclusive
}

// cosmoshub-4 genesis (docs/01-architecture.md, docs/02-data-sources.md) — the
// floor for both "until" and "all_time"'s implicit start.
export const GENESIS_UNIX_SECONDS = Math.floor(
  new Date('2021-02-18T00:00:00Z').getTime() / 1000,
)

// "3 months back" means a calendar-month subtraction (matches the old
// pre-rewrite picker's `start.setMonth(today.getMonth() - months)`), not a
// fixed day count — so "3 months" from Mar 31 lands on ~Dec 31, not Jan 1.
function subtractMonths(unixSeconds: number, months: number): number {
  const d = new Date(unixSeconds * 1000)
  d.setUTCMonth(d.getUTCMonth() - months)
  return Math.floor(d.getTime() / 1000)
}

// `until` must already be clamped to [GENESIS_UNIX_SECONDS, now] by the
// caller (server.ts) before this runs.
export function resolveRange(preset: RangePreset, untilUnixSeconds: number): ResolvedRange {
  if (preset === 'all_time') {
    return { from: GENESIS_UNIX_SECONDS, to: untilUnixSeconds }
  }
  const months = preset === 'last_3_months' ? 3 : preset === 'last_6_months' ? 6 : 12
  const from = Math.max(GENESIS_UNIX_SECONDS, subtractMonths(untilUnixSeconds, months))
  return { from, to: untilUnixSeconds }
}

export function isRangePreset(value: unknown): value is RangePreset {
  return (
    value === 'last_3_months' ||
    value === 'last_6_months' ||
    value === 'last_year' ||
    value === 'all_time'
  )
}

// Parses a "YYYY-MM-DD" day string as an inclusive end-of-day UTC timestamp
// (so `until=2026-08-01` includes everything on Aug 1st), clamped to
// [GENESIS_UNIX_SECONDS, now]. Returns `now` for a missing/unparseable input.
export function parseUntil(value: string | null | undefined): number {
  const now = Math.floor(Date.now() / 1000)
  if (!value) return now
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return now
  const [, y, m, d] = match
  const endOfDay = Date.UTC(Number(y), Number(m) - 1, Number(d), 23, 59, 59) / 1000
  if (!Number.isFinite(endOfDay)) return now
  return Math.min(now, Math.max(GENESIS_UNIX_SECONDS, Math.floor(endOfDay)))
}
