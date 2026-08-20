import { env } from './env';
import type { MetaJson, MonthlyBucket, SummaryJson, ValidatorSummaryJson, ValidatorsJson } from '@/types/data';
import type { RangeSearch } from '@/types/range';

// Thin fetch wrapper around backend/api/server.ts — the frontend does no
// aggregation or Mongo access itself, it just renders what the backend's
// dashboard endpoint returns (docs/05-frontend-data-layer.md).

// Mirrors backend/api/lib/dateRange.ts's own defaults — omitting a param
// entirely (rather than sending it empty) lets the backend's own fallback
// stay the single source of truth for "what does no selection mean".
function rangeQuery(range?: RangeSearch): string {
  if (!range) return '';
  const params = new URLSearchParams();
  if (range.range) params.set('range', range.range);
  if (range.until) params.set('until', range.until);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${env.backendApiUrl}${path}`);
  if (!res.ok) {
    throw new Error(`backend api ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchMeta(): Promise<MetaJson> {
  return getJson<MetaJson>('/api/meta');
}

export function fetchSummary(range?: RangeSearch): Promise<SummaryJson> {
  return getJson<SummaryJson>(`/api/summary${rangeQuery(range)}`);
}

export function fetchValidators(range?: RangeSearch): Promise<ValidatorsJson> {
  return getJson<ValidatorsJson>(`/api/validators${rangeQuery(range)}`);
}

// null (not thrown) for an unknown/excluded address — the route turns this
// into a plain 404 rather than a 500.
export async function fetchValidatorSummary(
  operatorAddress: string,
  range?: RangeSearch,
): Promise<ValidatorSummaryJson | null> {
  const res = await fetch(
    `${env.backendApiUrl}/api/validators/${encodeURIComponent(operatorAddress)}/summary${rangeQuery(range)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`backend api validator summary -> ${res.status}`);
  return (await res.json()) as ValidatorSummaryJson;
}

export function fetchValidatorSeries(operatorAddress: string, range?: RangeSearch): Promise<MonthlyBucket[]> {
  return getJson<MonthlyBucket[]>(`/api/validators/${encodeURIComponent(operatorAddress)}/series${rangeQuery(range)}`);
}
