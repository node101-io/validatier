import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `fund_flow_edges` exactly — the
// versioned snapshot of the SQLite taint graph. Dashboard reads the max
// published version only; `published` is the commit switch that keeps a
// half-written snapshot invisible.
export interface IFundFlowEdge {
  version: number;
  published: boolean;

  origin: string; // operator_address (source validator)
  holder: string; // address currently holding the money
  depth: number; // origin -> holder hop count

  weight: string; // uatom BigInt-string — current balance on this edge
  weight_prefix_sum: string; // cumulative flow through this edge

  status: 'in_flight' | 'realized' | 'suspected';
  sink_tier: number | null; // null | 1 | 2
  sink_kind: 'cex' | 'dex' | 'ibc_out' | 'structural' | null;

  first_seen_height: number;
  first_seen_timestamp: number;
  last_update_height: number;
  last_update_timestamp: number;
}

const fundFlowEdgeSchema = new Schema<IFundFlowEdge>(
  {
    version: { type: Number, required: true },
    published: { type: Boolean, required: true, default: false },

    origin: { type: String, required: true },
    holder: { type: String, required: true },
    depth: { type: Number, required: true },

    weight: { type: String, required: true },
    weight_prefix_sum: { type: String, required: true },

    status: { type: String, required: true, enum: ['in_flight', 'realized', 'suspected'] },
    // null while the edge hasn't reached a sink (enum skips null values)
    sink_tier: { type: Number, enum: [1, 2], default: null },
    sink_kind: { type: String, enum: ['cex', 'dex', 'ibc_out', 'structural'], default: null },

    first_seen_height: { type: Number, required: true },
    first_seen_timestamp: { type: Number, required: true },
    last_update_height: { type: Number, required: true },
    last_update_timestamp: { type: Number, required: true },
  },
  { versionKey: false }
);

fundFlowEdgeSchema.index({ version: 1, origin: 1, holder: 1 }, { unique: true });
fundFlowEdgeSchema.index({ version: 1, origin: 1, last_update_timestamp: 1 }); // per-validator interval
fundFlowEdgeSchema.index({ version: 1, holder: 1 }); // Tier 2 in-degree
fundFlowEdgeSchema.index({ version: 1, status: 1 });
fundFlowEdgeSchema.index({ published: 1, version: -1 }); // latest published version

export const FundFlowEdge = model<IFundFlowEdge>(
  'FundFlowEdge',
  fundFlowEdgeSchema,
  'fund_flow_edges'
);
