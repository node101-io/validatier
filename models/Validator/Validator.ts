
import mongoose, { Schema, Model } from 'mongoose';
import ValidatorChangeEvent from '../ValidatorChangeEvent/ValidatorChangeEvent.js';

import { isOperatorAddressValid, isPubkeyValid } from '../../utils/validationFunctions.js';

export interface ValidatorInterface {
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
  saveValidator: (
    body: {
      pubkey: string;
      operator_address: string;
      moniker: string;
      commission_rate: string;
      bond_shares: string;
      liquid_shares: string;
    }, 
    callback: (
      err: string, 
      newValidator: ValidatorInterface
    ) => any
  ) => any;
  updateValidator: (
    body: {
      operator_address: string;
      moniker: string;
      commission_rate: string;
      bond_shares: string;
      liquid_shares: string;
    }, 
    callback: (
      err: string, 
      updatedValidator: ValidatorInterface
    ) => any
  ) => any;
  deleteValidator: (
    body: {
      operator_address: string
    }, 
    callback: (
      err: string, 
      validator: ValidatorInterface
    ) => any
  ) => any;
  getValidatorById: (
    body: {
      operator_address: string
    }, 
    callback: (
      err: string, 
      validator: ValidatorInterface
    ) => any
  ) => any;
}

const validatorSchema = new Schema<ValidatorInterface>({
  pubkey: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (value: string): boolean {
        const requiredLength = 44;
        return value.length === requiredLength;
      },
      message: 'invalid_length',
    },
  },
  operator_address: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (value: string): boolean {
        const requiredLength = 52;
        return value.includes('cosmosvaloper1') && value.length === requiredLength;
      },
      message: 'invalid_length',
    },
  },
  moniker: { 
    type: String, 
    required: true,
    trim: true
  },
  commission_rate: { 
    type: String, 
    required: true,
    trim: true
  },
  bond_shares: { 
    type: String, 
    required: true,
    trim: true
  },
  liquid_shares: { 
    type: String, 
    required: true,
    trim: true
  },
  created_at: { 
    type: Date, 
    default: new Date() 
  },
  deleted_at: { 
    type: Date, 
    default: null 
  }
});


validatorSchema.statics.saveValidator = function (
  body: {
    pubkey: string;
    operator_address: string;
    moniker: string;
    commission_rate: string;
    bond_shares: string;
    liquid_shares: string;
  }, 
  callback: (
    err: string | null, 
    newValidator: ValidatorInterface | null
  ) => any
) {
  if (!body.pubkey) return callback('bad_request', null);

  const { pubkey, operator_address, moniker, commission_rate, bond_shares, liquid_shares } = body;

  if (!isOperatorAddressValid(operator_address) || !isPubkeyValid(pubkey)) return callback('format_error', null);

  Validator.findOne(
    { $or: [ 
      { operator_address: operator_address, deletedAt: null },
      { pubkey: pubkey, deletedAt: null }
    ]}, 
    (err: string, oldValidator: ValidatorInterface) => {

      if (err) return callback(err, null);
      if (!oldValidator) {
        Validator
          .create(body)
          .then((newValidator: ValidatorInterface) => {
            if (!newValidator) return callback('creation_error', null);
            return callback(null, newValidator);
          })
          .catch(err => callback('creation_error', null))
      }


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
          if (err) return callback('bad_request', null);
          return callback(null, updatedValidator);
        })
      })
    }
  )
}


validatorSchema.statics.updateValidator = function (
  body: {
    operator_address: string;
    moniker: string;
    commission_rate: string;
    bond_shares: string;
    liquid_shares: string;
  }, 
  callback: (
    err: string | null,
    updatedValidator: ValidatorInterface | null
  ) => any
) {
  
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


validatorSchema.statics.deleteValidator = function (
  body: {
    operator_address: string;
  }, 
  callback: (
    err: string | null,
    validator: ValidatorInterface | null
  ) => any
) {

  const { operator_address } = body;

  Validator.findOneAndUpdate(
    { operation_address: operator_address, deleted_at: null },
    { deleted_at: new Date() },
    (err: string, deletedValidator: ValidatorInterface) => {
      if (err) return callback(err, null);
      return callback(null, deletedValidator);
    }
  )
}


validatorSchema.statics.getValidatorOperatorAddress = function (
  body: {
    operator_address: string;
  }, 
  callback: (
    err: string | null,
    validator: ValidatorInterface | null
  ) => any
) {

  const { operator_address } = body;

  Validator.findOne({ operator_address, deleted_at: null }, (err: string, validator: ValidatorInterface) => {
    if (err) return callback(err, null);
    return callback(null, validator);
  })
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', validatorSchema);

export default Validator;
