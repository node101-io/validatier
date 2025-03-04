
import mongoose, { Schema, Model } from 'mongoose';
import Validator, { ValidatorInterface } from '../Validator/Validator.js';
import { isRecordChanged } from './functions/isRecordChanged.js';
import { generateChangeObjectToSave } from './functions/generateChangeObjectToSave.js';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

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
      err: string | null,
      ValidatorChangeEvent: ValidatorChangeEventInterface | true | null
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
    type: [{
      type: String,
      trim: true
    }], 
    required: true
  },
  oldValues: { 
    type: [{
      type: String,
      trim: true
    }], 
    required: true
  },
  newValues: { 
    type: [{
      type: String,
      trim: true
    }], 
    required: true
  },
});


validatorChangeEventSchema.statics.saveValidatorChangeEvent = function (
  body: Parameters<ValidatorChangeEventModel['saveValidatorChangeEvent']>[0], 
  callback: Parameters<ValidatorChangeEventModel['saveValidatorChangeEvent']>[1],
) {

  const { operator_address } = body;

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  Validator
    .findOne({ operator_address: operator_address })
    .then((validator) => {
      if (!validator) return callback('fetch_error', null);

      isRecordChanged(validator, body, ['moniker', 'commission_rate', 'bond_shares', 'liquid_shares', 'keybase_id'], (err: string, changedAttributes) => {
        if (err) return callback(err, null);
        if (!changedAttributes || changedAttributes.length <= 0) return callback(null, true); 

        generateChangeObjectToSave(changedAttributes, validator, body, (err, result) => {
          if (err) return callback('bad_request', null);

          ValidatorChangeEvent
            .create({
              operator_address: operator_address,
              changedAttributes: changedAttributes,
              oldValues: result?.oldBody,
              newValues: result?.newBody
            })
            .then((newValidatorChangeEvent: ValidatorChangeEventInterface) => {
              if (!newValidatorChangeEvent) return callback('creation_error', null);
              return callback(null, newValidatorChangeEvent);
            })
            .catch(err => callback('creation_error', null))
        })
      })
    })
    .catch(err => callback(err, null))
}



const ValidatorChangeEvent = mongoose.model<ValidatorChangeEventInterface, ValidatorChangeEventModel>('ValidatorChangeEvents', validatorChangeEventSchema);

export default ValidatorChangeEvent;
