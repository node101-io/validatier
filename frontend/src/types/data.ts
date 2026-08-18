// Mirrors docs/05-static-json-contract.md — the shape of everything under
// public/data/**, produced by backend/export/exportJson.ts.
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

export interface ValidatorDetailJson {
  validator: ValidatorDetail;
  metrics: Metric[];
  stats: MonthlyBucket[];
  ranks: {
    percentageSoldRank: number;
    totalValidators: number;
  };
}
