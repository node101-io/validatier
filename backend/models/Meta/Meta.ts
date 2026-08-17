import { Schema, model, type Model, type HydratedDocument } from 'mongoose';
import { getSingleton } from './functions/getSingleton';

// Schema mirrors docs/03-mongo-schema.md `meta` exactly — a SINGLE document:
// block-scan cursor + published version pointer + chain-wide totals.
// Always access it through Meta.getSingleton().
export interface IMeta {
  scanned_up_to_height: number; // block-scan cursor
  scanned_up_to_time: number;
  fund_flow_current_version: number; // published version pointer
  fund_flow_edge_count: number;
  fund_flow_totals: {
    // uatom BigInt-strings (from SUM over edges at snapshot time)
    in_flight: string;
    realized: string;
    suspected: string;
  };
  is_genesis_saved: boolean;
  updated_at: Date;
}

export interface MetaModel extends Model<IMeta> {
  getSingleton(): Promise<HydratedDocument<IMeta>>;
}

const metaSchema = new Schema<IMeta, MetaModel>(
  {
    scanned_up_to_height: { type: Number, required: true, default: 0 },
    scanned_up_to_time: { type: Number, required: true, default: 0 },
    fund_flow_current_version: { type: Number, required: true, default: 0 },
    fund_flow_edge_count: { type: Number, required: true, default: 0 },
    fund_flow_totals: {
      in_flight: { type: String, required: true, default: '0' },
      realized: { type: String, required: true, default: '0' },
      suspected: { type: String, required: true, default: '0' },
    },
    is_genesis_saved: { type: Boolean, required: true, default: false },
    updated_at: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false }
);

metaSchema.static('getSingleton', getSingleton);

export const Meta = model<IMeta, MetaModel>('Meta', metaSchema, 'meta');
