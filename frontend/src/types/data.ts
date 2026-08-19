// Mirrors docs/05-frontend-data-layer.md — the JSON shapes served by
// backend/api/server.ts (an API contract boundary, not shared code: the
// backend has its own copy of these shapes in backend/api/types.ts).
// Fetched via src/server/api.ts, exposed through the server functions in
// src/lib/data.ts.
import type Validator from "@/types/validator";
import type Metric from "@/types/metric";
import type SummaryData from "@/types/summary";

export interface MonthlyBucket {
  year: number;
  month: number;
  data: {
    timestamp: Array<number | null>;
    total_stake: Array<number | null>;
    total_sold: Array<number | null>;
    price: Array<number | null>;
  };
}

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

export interface ValidatorsJson {
  validators: Validator[];
}

export interface ValidatorDetail extends Validator {
  description: string | null;
  security_contact: string | null;
  delegator_address: string | null;
  commission_rate: string;
}

// GET /api/validators/:operatorAddress/summary — no `stats` here: the graph
// series is a separate endpoint (/series) fetched independently and deferred
// (see routes/validator.$operatorAddress.tsx), so the header card can render
// before the series is even requested.
export interface ValidatorSummaryJson {
  validator: ValidatorDetail;
  metrics: Metric[];
  ranks: {
    percentageSoldRank: number;
    totalValidators: number;
  };
}
