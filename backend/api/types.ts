// docs/05-frontend-data-layer.md — response shapes served by backend/api/server.ts.
// Mirrored (not imported) on the frontend side in frontend/src/types/data.ts —
// this is a normal API contract boundary, not shared runtime code.
import type { ValidatorRow, Metric, SummaryData } from './lib/aggregate';
import type { MonthlyBucket } from './lib/statsSeries';

export type { MonthlyBucket, ValidatorRow, Metric, SummaryData };

export interface MetaJson {
  generated_at: number;
  scanned_up_to_height: number;
  fund_flow_version: number;
  price: number;
}

export interface SummaryJson {
  summaryData: SummaryData;
  metrics: Metric[];
  stats: MonthlyBucket[];
}

export interface ValidatorDetail extends ValidatorRow {
  description: string | null;
  security_contact: string | null;
  delegator_address: string | null;
  commission_rate: string;
}

export interface ValidatorSummaryJson {
  validator: ValidatorDetail;
  metrics: Metric[];
  ranks: {
    percentageSoldRank: number;
    totalValidators: number;
  };
}

export interface DashboardSnapshot {
  meta: MetaJson;
  summary: SummaryJson;
  validators: ValidatorRow[];
  summaryByOperator: Map<string, ValidatorSummaryJson>;
  seriesByOperator: Map<string, MonthlyBucket[]>;
}
