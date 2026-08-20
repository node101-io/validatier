// Mirrors backend/api/lib/dateRange.ts — the date-range selector's URL state.
// `until` is 'YYYY-MM-DD'; both are optional route search params (missing ==
// all_time / today, same default the backend resolves to).
export type RangePreset = "last_3_months" | "last_6_months" | "last_year" | "all_time";

export interface RangeSearch {
  range?: RangePreset;
  until?: string;
}

export const RANGE_PRESETS: RangePreset[] = [
  "last_3_months",
  "last_6_months",
  "last_year",
  "all_time",
];

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  last_3_months: "Last 3 months",
  last_6_months: "Last 6 months",
  last_year: "Last year",
  all_time: "All time",
};

export function isRangePreset(value: unknown): value is RangePreset {
  return typeof value === "string" && (RANGE_PRESETS as string[]).includes(value);
}

// cosmoshub-4 genesis — mirrors backend/api/lib/dateRange.ts's GENESIS_UNIX_SECONDS,
// used to bound the "until" calendar.
export const GENESIS_DATE = new Date("2021-02-18T00:00:00Z");
