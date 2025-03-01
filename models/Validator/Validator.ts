
import mongoose, { Schema, Document, Model } from 'mongoose';
import ValidatorChangeEvent from '../ValidatorChangeEvent/ValidatorChangeEvent.js';

export interface ValidatorInterface extends Document {
  pubkey: string;
  operator_address: string;
  moniker: string;
  commission_rate: string;
  bond_shares: string;
  liquid_shares: string;
  created_at: Date;
  deleted_at: Date;
}

interface ValidatorModel extends Model<ValidatorInterface> {
  saveValidator: (body: SaveNewValidatorInterface, callback: (err: string, newValidator: ValidatorInterface) => any) => any;
  updateValidator: (body: UpdateValidatorInterface, callback: (err: string, updatedValidator: ValidatorInterface) => any) => any;
  deleteValidator: (body: DeleteValidatorInterface, callback: (err: string, Validator: ValidatorInterface) => any) => any;
  getValidatorById: (body: ValidatorByIdInterface, callback: (err: string, Validator: ValidatorInterface) => any) => any;
}

interface UpdateValidatorInterface {
  operator_address: string;
  moniker: string;
  commission_rate: string;
  bond_shares: string;
  liquid_shares: string;
}

interface SaveNewValidatorInterface {
  pubkey: string;
  operator_address: string;
  moniker: string;
  commission_rate: string;
  bond_shares: string;
  liquid_shares: string;
}

interface DeleteValidatorInterface {
  id: string;
}
interface ValidatorByIdInterface {
  id: string;
}

const validatorSchema = new Schema<ValidatorInterface>({
  pubkey: { type: String, required: true },
  operator_address: { type: String, required: true },
  moniker: { type: String, required: true },
  commission_rate: { type: String, required: true },
  bond_shares: { type: String, required: true },
  liquid_shares: { type: String, required: true },
  created_at: { type: Date, default: new Date() },
  deleted_at: { type: Date, default: null }
});


validatorSchema.statics.saveValidator = function (body: SaveNewValidatorInterface, callback: (err: string | null, newValidator: ValidatorInterface | null) => any)
{
  if (!body.pubkey) return callback('Validator_pubkey_not_found', null);

  const { pubkey, operator_address, moniker, commission_rate, bond_shares, liquid_shares } = body;

  Validator.findOne(
    { $or: [ 
      { operator_address: operator_address, deletedAt: null },
      { pubkey: pubkey, deletedAt: null }
    ]}, 
    (err: string, oldValidator: ValidatorInterface) => {

      if (err) return callback(err, null);
      if (!oldValidator) return Validator.create(body, (err, newValidator: ValidatorInterface) => {
        if (err || !newValidator) return callback('creation_error_validator', null);
        return callback(null, newValidator);
      })


      const updateAndChangeValidatorBody = {
        operator_address: operator_address,
        moniker: moniker,
        commission_rate: commission_rate,
        bond_shares: bond_shares,
        liquid_shares: liquid_shares
      }

      ValidatorChangeEvent.saveValidatorChangeEvent(updateAndChangeValidatorBody, (err, newValidatorChangeEvent) => {
        if (err || !newValidatorChangeEvent) return callback(err, null);

        Validator.updateValidator(updateAndChangeValidatorBody, (err, updatedValidator) => {
          if (err) return callback('update_error_validator', null);
          return callback(null, updatedValidator);
        })
      })
    }
  )
}


validatorSchema.statics.updateValidator = function (body: UpdateValidatorInterface, callback) {
  
  const { operator_address, moniker, commission_rate, bond_shares, liquid_shares } = body;
  
  Validator.findOneAndUpdate(
    { operator_address: operator_address },
    { moniker: moniker, commission_rate: commission_rate, bond_shares: bond_shares, liquid_shares: liquid_shares },
    (err: string, updatedValidator: ValidatorInterface) => {
      if (err) return callback(err, null);
      return callback(null, updatedValidator);
    }
  )
}


validatorSchema.statics.deleteValidator = function (body: DeleteValidatorInterface, callback)
{
  Validator.findByIdAndUpdate(
    body.id,
    { deleted_at: new Date() },
    (err: string, Validator: ValidatorInterface) => {
      if (err) return callback(err);
      return callback(null, Validator);
    }
  )
}


validatorSchema.statics.getValidatorById = function (body: ValidatorByIdInterface, callback)
{
  Validator.findOne({ id: body.id, deleted_at: null }, (err: string, Validator: ValidatorInterface) => {
    if (err) return callback(err);
    return callback(null, Validator);
  })
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', validatorSchema);

export default Validator;
