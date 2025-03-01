
import mongoose, { Schema, Model } from 'mongoose';
import Validator, { ValidatorInterface } from '../Validator/Validator.js';
import { isRecordChanged } from './functions/isRecordChanged.js';
import { generateChangeObjectToSave } from './functions/generateChangeObjectToSave.js';

export interface ValidatorChangeEventInterface {
  timestamp: Date;
  operator_address: string;
  changedAttributes: string[];
  oldValues: string[];
  newValues: string[];
}

interface ValidatorChangeEventModel extends Model<ValidatorChangeEventInterface> {
  saveValidatorChangeEvent: (
    body: {
      operator_address: string;
      moniker: string;
      commission_rate: string;
      bond_shares: string;
      liquid_shares: string;
    }, 
    callback: (
      err: string, 
      ValidatorChangeEvent: ValidatorChangeEventInterface
    ) => any
  ) => any;
}

const validatorChangeEventSchema = new Schema<ValidatorChangeEventInterface>({
  timestamp: { 
    type: Date, 
    default: new Date(),
    trim: true
  },
  operator_address: { 
    type: String, 
    required: true, 
    trim: true
  },
  changedAttributes: { 
    type: [String], 
    required: true
  },
  oldValues: { 
    type: [String], 
    required: true,
  },
  newValues: { 
    type: [String], 
    required: true 
  },
});


validatorChangeEventSchema.statics.saveValidatorChangeEvent = function (
  body: {
    operator_address: string;
    moniker: string;
    commission_rate: string;
    bond_shares: string;
    liquid_shares: string;
  }, 
  callback: (
    err: string | null,
    newValidatorChangeEvent: ValidatorChangeEventInterface | string | null
  ) => any
) {

  const { operator_address } = body;

  Validator.findOne({ operator_address: operator_address }, (err: string, validator: ValidatorInterface) => {
    
    if (err || !validator) return callback('fetch_error', null);

    isRecordChanged(validator, body, ['moniker', 'commission_rate', 'bond_shares', 'liquid_shares'], (err: string, changedAttributes) => {
      if (err) return callback(err, null);
      if (!changedAttributes || changedAttributes.length <= 0) return callback(null, 'no_change_occured'); 

      generateChangeObjectToSave(changedAttributes, validator, body, (err, result) => {
        if (err) return callback('bad_request', null);

        ValidatorChangeEvent.create({
          operator_address: operator_address,
          changedAttributes: changedAttributes,
          oldValues: result?.oldBody,
          newValues: result?.newBody
        }, (err, newValidatorChangeEvent) => {
          if (err || !newValidatorChangeEvent) return callback('creation_error', null);
          return callback(null, newValidatorChangeEvent);
        })
      })
    })
  })
}



const ValidatorChangeEvent = mongoose.model<ValidatorChangeEventInterface, ValidatorChangeEventModel>('ValidatorChangeEvents', validatorChangeEventSchema);

export default ValidatorChangeEvent;
