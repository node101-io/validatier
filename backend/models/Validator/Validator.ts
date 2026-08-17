import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `validators` exactly. Canonical key is
// operator_address — deliberately NO pubkey field (a consensus pubkey can be
// reused across validators, so it is not a stable identity).
export interface IValidator {
  operator_address: string; // cosmosvaloper1... (CANONICAL KEY)
  delegator_address?: string; // account/default withdraw (cosmos1...), same 20 bytes
  moniker?: string;
  website?: string;
  description?: string;
  security_contact?: string;
  commission_rate?: string; // decimal string "0.05..." — never a float
  keybase_id: string;
  temporary_image_uri?: string;
  created_at: Date;
}

const validatorSchema = new Schema<IValidator>(
  {
    operator_address: { type: String, required: true, unique: true },
    // sparse: docs without the field don't collide on the unique index
    delegator_address: { type: String, unique: true, sparse: true },
    moniker: { type: String, index: true },
    website: { type: String },
    description: { type: String },
    security_contact: { type: String },
    commission_rate: { type: String },
    keybase_id: { type: String, default: '' },
    temporary_image_uri: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const Validator = model<IValidator>('Validator', validatorSchema, 'validators');
