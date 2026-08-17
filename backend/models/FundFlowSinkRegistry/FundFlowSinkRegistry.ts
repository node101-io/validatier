import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `fund_flow_sink_registry` exactly.
// Persistent copy of sink addresses: Tier 1 = static CEX/DEX list, Tier 2 =
// discovered by the in-degree heuristic (kept separate, reviewed manually).
export interface IFundFlowSinkRegistry {
  address: string;
  tier: 1 | 2;
  // 'validator' = a validator's own wallet on the curated list (explicit
  // business decision to treat it as a Tier 1 sink — see docs/01).
  kind: 'cex' | 'dex' | 'ibc_out' | 'structural' | 'validator';
  label?: string; // optional — "Binance hot wallet"
  source: 'static' | 'heuristic';
  discovered_at_height: number | null; // null (static) | discovery height
}

const fundFlowSinkRegistrySchema = new Schema<IFundFlowSinkRegistry>(
  {
    address: { type: String, required: true, unique: true },
    tier: { type: Number, required: true, enum: [1, 2], index: true },
    kind: {
      type: String,
      required: true,
      enum: ['cex', 'dex', 'ibc_out', 'structural', 'validator'],
    },
    label: { type: String },
    source: { type: String, required: true, enum: ['static', 'heuristic'] },
    discovered_at_height: { type: Number, default: null },
  },
  { versionKey: false }
);

export const FundFlowSinkRegistry = model<IFundFlowSinkRegistry>(
  'FundFlowSinkRegistry',
  fundFlowSinkRegistrySchema,
  'fund_flow_sink_registry'
);
