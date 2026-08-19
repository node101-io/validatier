import { env } from './env';
import type { MetaJson, MonthlyBucket, SummaryJson, ValidatorSummaryJson, ValidatorsJson } from '@/types/data';

// Thin fetch wrapper around backend/api/server.ts — the frontend does no
// aggregation or Mongo access itself, it just renders what the backend's
// dashboard endpoint returns (docs/05-frontend-data-layer.md).

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

export function fetchSummary(): Promise<SummaryJson> {
  return getJson<SummaryJson>('/api/summary');
}

export function fetchValidators(): Promise<ValidatorsJson> {
  return getJson<ValidatorsJson>('/api/validators');
}

// null (not thrown) for an unknown/excluded address — the route turns this
// into a plain 404 rather than a 500.
export async function fetchValidatorSummary(operatorAddress: string): Promise<ValidatorSummaryJson | null> {
  const res = await fetch(`${env.backendApiUrl}/api/validators/${encodeURIComponent(operatorAddress)}/summary`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`backend api validator summary -> ${res.status}`);
  return (await res.json()) as ValidatorSummaryJson;
}

export function fetchValidatorSeries(operatorAddress: string): Promise<MonthlyBucket[]> {
  return getJson<MonthlyBucket[]>(`/api/validators/${encodeURIComponent(operatorAddress)}/series`);
}
