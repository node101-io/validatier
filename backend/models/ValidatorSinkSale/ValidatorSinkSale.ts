import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `validator_sink_sales` exactly. Sparse
// append-only log: a doc is written ONLY when the cumulative realized-sold amount for a
// given (operator_address, sink_address) pair actually changed since the last entry — no
// zero-delta entries, no daily no-op rows, no fixed-length arrays. Interval queries find the
// latest doc at-or-before each timestamp and subtract.
export interface IValidatorSinkSale {
  operator_address: string; // origin validator
  sink_address: string; // specific sink/exchange address (fund_flow_sink_registry.address)
  sink_kind: 'cex' | 'dex' | 'ibc_out'; // realized-only; never 'structural' (that's suspected-only)

  cumulative_sold: string; // uatom BigInt-string — monotonic non-decreasing running total

  block_height: number;
  timestamp: number; // unix sec
  day: number;
  month: number;
  year: number;
}

const validatorSinkSaleSchema = new Schema<IValidatorSinkSale>(
  {
    operator_address: { type: String, required: true },
    sink_address: { type: String, required: true },
    sink_kind: { type: String, required: true, enum: ['cex', 'dex', 'ibc_out'] },

    cumulative_sold: { type: String, required: true },

    block_height: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { versionKey: false }
);

// idempotency guard (job runs once/day) + "latest entry at-or-before t" lookup
validatorSinkSaleSchema.index(
  { operator_address: 1, sink_address: 1, timestamp: -1 },
  { unique: true }
);

export const ValidatorSinkSale = model<IValidatorSinkSale>(
  'ValidatorSinkSale',
  validatorSinkSaleSchema,
  'validator_sink_sales'
);
