
import mongoose, { Schema, Document, Model } from 'mongoose';
import { isRecordChanged } from '../../utils/isRecordChanged.js';
import Validator, { ValidatorInterface } from '../Validator/Validator.js';
import { generateChangeObjectToSave } from '../../utils/generateChangeObjectToSave.js';

export interface ValidatorChangeEventInterface extends Document {
  timestamp: Date;
  operator_address: string;
  changedAttributes: string[];
  oldValues: string[];
  newValues: string[];
}

interface ValidatorChangeEventModel extends Model<ValidatorChangeEventInterface> {
  saveValidatorChangeEvent: (body: SaveValidatorChangeEventInterface, callback: (err: string, ValidatorChangeEvent: ValidatorChangeEventInterface) => any) => any;
}

export interface SaveValidatorChangeEventInterface {
  operator_address: string;
  moniker: string;
  commission_rate: string;
  bond_shares: string;
  liquid_shares: string;
}


const validatorChangeEventSchema = new Schema<ValidatorChangeEventInterface>({
  timestamp: { type: Date, default: new Date() },
  operator_address: { type: String, required: true },
  changedAttributes: { type: [String], required: true },
  oldValues: { type: [String], required: true },
  newValues: { type: [String], required: true },
});


validatorChangeEventSchema.statics.saveValidatorChangeEvent = function (body: SaveValidatorChangeEventInterface, callback)
{

  const { operator_address } = body;

  Validator.findOne({ operator_address: operator_address }, (err: string, validator: ValidatorInterface) => {
    
    if (err || !validator) return callback("fetch_error");

    isRecordChanged(validator, body, ['moniker', 'commission_rate', 'bond_shares', 'liquid_shares'], (err, changedAttributes) => {
      if (err) return callback(err);
      if (!changedAttributes || changedAttributes.length <= 0) return callback(null, "no_change_occured"); 

      generateChangeObjectToSave(changedAttributes, validator, body, (err, result) => {
        if (err) return callback("conversion_error", null);

        ValidatorChangeEvent.create({
          operator_address: operator_address,
          changedAttributes: changedAttributes,
          oldValues: result?.oldBody,
          newValues: result?.newBody
        }, (err, newValidatorChangeEvent) => {
          if (err || !newValidatorChangeEvent) return callback("creation_error", null);
          return callback(null, newValidatorChangeEvent);
        })
      })
    })
  })
}



const ValidatorChangeEvent = mongoose.model<ValidatorChangeEventInterface, ValidatorChangeEventModel>('ValidatorChangeEvents', validatorChangeEventSchema);

export default ValidatorChangeEvent;
