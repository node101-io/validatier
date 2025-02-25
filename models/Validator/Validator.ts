
import mongoose, { Schema, Document, Model } from 'mongoose';

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
  createNewValidator: (body: CreateNewValidatorInterface, callback: (err: string, newValidator: ValidatorInterface) => any) => any;
  deleteValidator: (body: DeleteValidatorInterface, callback: (err: string, Validator: ValidatorInterface) => any) => any;
  getValidatorById: (body: ValidatorByIdInterface, callback: (err: string, Validator: ValidatorInterface) => any) => any;
}

interface CreateNewValidatorInterface {
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

const ValidatorSchema = new Schema<ValidatorInterface>({
  pubkey: { type: String, required: true },
  operator_address: { type: String, required: true },
  moniker: { type: String, required: true },
  commission_rate: { type: String, required: true },
  bond_shares: { type: String, required: true },
  liquid_shares: { type: String, required: true },
  created_at: { type: Date, default: new Date() },
  deleted_at: { type: Date, default: null }
});


ValidatorSchema.statics.createNewValidator = function (body: CreateNewValidatorInterface, callback: (err: string | null, newValidator: ValidatorInterface | null) => any)
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
      if (oldValidator) return callback(null, oldValidator);

      Validator.create({
        pubkey: pubkey,
        operator_address: operator_address,
        moniker: moniker,
        commission_rate: commission_rate,
        bond_shares: bond_shares,
        liquid_shares: liquid_shares,
      }, (err, newValidator: ValidatorInterface) => {
        if (err || !newValidator) return callback('creation_error_Validator', null);
        return callback(null, newValidator);
      })
    }
  )
}

ValidatorSchema.statics.deleteValidator = function (body: DeleteValidatorInterface, callback)
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


ValidatorSchema.statics.getValidatorById = function (body: ValidatorByIdInterface, callback)
{
  Validator.findOne({ id: body.id, deleted_at: null }, (err: string, Validator: ValidatorInterface) => {
    if (err) return callback(err);
    return callback(null, Validator);
  })
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', ValidatorSchema);

export default Validator;
