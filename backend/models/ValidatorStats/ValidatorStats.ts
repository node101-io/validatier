import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `validator_stats` exactly.
// One document per validator PER MONTH. Each daily field is a fixed-length 31 array,
// index = day-1 (index 0 = day 1 ... index 30 = day 31). Short months just leave
// trailing slots null forever. Pure snapshots: absolute values only — NO deltas, NO
// prefix_sum (interval change = difference of two populated array slots).
export const DAYS_PER_MONTH_ARRAY_LENGTH = 31;

export interface IValidatorStats {
  operator_address: string;
  year: number;
  month: number; // 1-12

  timestamp: Array<number | null>; // length 31 — unix sec of that day's snapshot
  block_height: Array<number | null>; // length 31 — height the snapshot was taken at

  total_stake: Array<string | null>; // length 31 — ABSOLUTE — uatom BigInt-string

  // CUMULATIVE to date, sourced from SQLite `seed` (fund-flow pipeline), written
  // by the daily stats job. sold% denominator = reward + commission.
  total_withdrawn_reward: Array<string | null>; // length 31
  total_withdrawn_commission: Array<string | null>; // length 31
}

function emptyMonthArray<T>(): Array<T | null> {
  return Array(DAYS_PER_MONTH_ARRAY_LENGTH).fill(null);
}

const validatorStatsSchema = new Schema<IValidatorStats>(
  {
    operator_address: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },

    timestamp: { type: [Number], default: emptyMonthArray },
    block_height: { type: [Number], default: emptyMonthArray },

    total_stake: { type: [String], default: emptyMonthArray },

    total_withdrawn_reward: { type: [String], default: emptyMonthArray },
    total_withdrawn_commission: { type: [String], default: emptyMonthArray },
  },
  { versionKey: false }
);

// per-validator time series / point-in-time across validators
validatorStatsSchema.index({ operator_address: 1, year: 1, month: 1 }, { unique: true });
validatorStatsSchema.index({ year: 1, month: 1, operator_address: 1 });

export const ValidatorStats = model<IValidatorStats>(
  'ValidatorStats',
  validatorStatsSchema,
  'validator_stats'
);
