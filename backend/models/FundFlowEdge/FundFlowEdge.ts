import { Schema, model } from 'mongoose';

// Mirrors the SQLite `edges` table's current state, one Mongo doc per
// (origin, holder) pair — NOT a versioned/dated snapshot. Every daily
// snapshot job (jobs/snapshot.ts) upserts only the edges that actually
// changed (via SQLite's own last_update_height/last_update_timestamp as the
// change signal) and deletes any edge that no longer exists in SQLite
// (contraction zeroes an edge out and removes the row — see
// engine/contraction.ts's deleteZeroed). No version/published fields: this
// collection previously wrote a FULL new copy of every edge, every day,
// forever (removed 2026-09-23 — 578 days of that had reached 8.2M documents
// for a collection nothing read). This design keeps exactly one row per
// edge, updated in place.
export interface IFundFlowEdge {
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

fundFlowEdgeSchema.index({ origin: 1, holder: 1 }, { unique: true });
fundFlowEdgeSchema.index({ origin: 1, last_update_timestamp: 1 }); // per-validator interval
fundFlowEdgeSchema.index({ holder: 1 }); // Tier 2 in-degree
fundFlowEdgeSchema.index({ status: 1 });

export const FundFlowEdge = model<IFundFlowEdge>(
  'FundFlowEdge',
  fundFlowEdgeSchema,
  'fund_flow_edges'
);
