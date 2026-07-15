import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `validator_stats` exactly.
// Pure DAILY snapshots: absolute values only — NO deltas, NO prefix_sum
// (interval change = difference of two rows).
export interface IValidatorStats {
  operator_address: string;
  timestamp: number; // unix sec of the snapshot
  day: number;
  month: number;
  year: number;
  block_height: number; // height the snapshot was taken at

  self_stake: string; // ABSOLUTE — uatom BigInt-string
  total_stake: string; // ABSOLUTE — uatom BigInt-string

  // CUMULATIVE to date, sourced from SQLite `seed` (fund-flow pipeline), written
  // by the daily stats job. sold% denominator = reward + commission.
  total_withdrawn_reward: string;
  total_withdrawn_commission: string;
}

const validatorStatsSchema = new Schema<IValidatorStats>(
  {
    operator_address: { type: String, required: true },
    timestamp: { type: Number, required: true },
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    block_height: { type: Number, required: true },

    self_stake: { type: String, required: true },
    total_stake: { type: String, required: true },

    total_withdrawn_reward: { type: String, required: true },
    total_withdrawn_commission: { type: String, required: true },
  },
  { versionKey: false }
);

// per-validator time series / point-in-time across validators
validatorStatsSchema.index({ operator_address: 1, timestamp: 1 });
validatorStatsSchema.index({ timestamp: 1, operator_address: 1 });

export const ValidatorStats = model<IValidatorStats>(
  'ValidatorStats',
  validatorStatsSchema,
  'validator_stats'
);
