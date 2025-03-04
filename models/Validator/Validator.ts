
import async from 'async';

import mongoose, { Schema, Model, Validator } from 'mongoose';
import ValidatorChangeEvent from '../ValidatorChangeEvent/ValidatorChangeEvent.js';

import { isOperatorAddressValid, isPubkeyValid } from '../../utils/validationFunctions.js';

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;

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
      err: string | null,
      newValidator: ValidatorInterface | null
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
      err: string | null,
      updatedValidator: ValidatorInterface | null
    ) => any
  ) => any;
  deleteValidator: (
    body: {
      operator_address: string
    }, 
    callback: (
      err: string | null,
      validator: ValidatorInterface | null
    ) => any
  ) => any;
  getValidatorByOperatorAddress: (
    body: {
      operator_address: string
    }, 
    callback: (
      err: string | null,
      validator: ValidatorInterface | null
    ) => any
  ) => any;
  getValidatorsByCustomFilter: (
    body: {
      minCommissionRate?: string;
      maxCommissionRate?: string;
      minBondShares?: string;
      maxBondShares?: string;
      minLiquidShares?: string;
      maxLiquidShares?: string;
    },
    callback: (
      err: string | null,
      validators: ValidatorInterface[] | null
    ) => any
  ) => any;
  deleteValidatorsNotAppearingOnApiResponse: (
    body: {
      visitedValidatorsOperatorAddresses: string[]
    },
    callback: (
      err: string | null, 
      validatorsMarkedAsDeleted: string[] | null
    ) => any
  ) => any
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
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
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
  body: Parameters<ValidatorModel['saveValidator']>[0], 
  callback: Parameters<ValidatorModel['saveValidator']>[1],
) {
  if (!body.pubkey) return callback('bad_request', null);

  const { pubkey, operator_address, moniker, commission_rate, bond_shares, liquid_shares } = body;

  if (!isOperatorAddressValid(operator_address) || !isPubkeyValid(pubkey)) return callback('format_error', null);

  Validator
    .findOne(
      { $or: [ 
        { operator_address: operator_address, deletedAt: null },
        { pubkey: pubkey, deletedAt: null }
      ]
    })
    .then((oldValidator) => {
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
    })
    .catch(err => callback(err, null))
}


validatorSchema.statics.updateValidator = function (
  body: Parameters<ValidatorModel['updateValidator']>[0], 
  callback: Parameters<ValidatorModel['updateValidator']>[1],
) {
  
  const { operator_address, moniker, commission_rate, bond_shares, liquid_shares } = body;
  
  Validator
    .findOneAndUpdate(
      { operator_address: operator_address },
      { moniker: moniker, commission_rate: commission_rate, bond_shares: bond_shares, liquid_shares: liquid_shares }
    )
    .then((updatedValidator) => {
      return callback(null, updatedValidator);
    })
    .catch(err => callback(err, null))
}


validatorSchema.statics.deleteValidator = function (
  body: Parameters<ValidatorModel['deleteValidator']>[0], 
  callback: Parameters<ValidatorModel['deleteValidator']>[1],
) {

  const { operator_address } = body;

  Validator
    .findOneAndUpdate(
      { operator_address: operator_address, deleted_at: null },
      { deleted_at: new Date() }
    )
    .then((deletedValidator) => {
      return callback(null, deletedValidator);
    })
    .catch(err => callback(err, null)) 
}


validatorSchema.statics.getValidatorByOperatorAddress = function (
  body: Parameters<ValidatorModel['getValidatorByOperatorAddress']>[0], 
  callback: Parameters<ValidatorModel['getValidatorByOperatorAddress']>[1],
) {

  const { operator_address } = body;

  Validator
    .findOne({ operator_address, deleted_at: null }) 
    .then((validator) => {
      return callback(null, validator);
    })
    .catch(err => callback(err, null));
}

validatorSchema.statics.getValidatorsByCustomFilter = function (
  body: Parameters<ValidatorModel['getValidatorsByCustomFilter']>[0], 
  callback: Parameters<ValidatorModel['getValidatorsByCustomFilter']>[1],
) {
  Validator
    .find({})
    .then((validators: ValidatorInterface[]) =>  callback(null, validators))
    .catch(err => callback('bad_request', null))
}


validatorSchema.statics.deleteValidatorsNotAppearingOnApiResponse = function (
  body: Parameters<ValidatorModel['deleteValidatorsNotAppearingOnApiResponse']>[0], 
  callback: Parameters<ValidatorModel['deleteValidatorsNotAppearingOnApiResponse']>[1],
) {

  const { visitedValidatorsOperatorAddresses } = body;

  const deletedValidatorsOperatorAddresses: string[] = [];

  Validator
    .find({ operator_address: { $nin: visitedValidatorsOperatorAddresses } })
    .then(validators => {
      if (!validators.length) callback(null, []);
      async.timesSeries(
        validators.length,
        (i, next) => {
          const eachValidatorToBeDeleted = validators[i];
          Validator.deleteValidator({ operator_address: eachValidatorToBeDeleted.operator_address }, (err, validator) => {
            if (err || !validator) return callback(err, null);
            deletedValidatorsOperatorAddresses.push(validator.operator_address);
            return next();
          })
        },
        (err) => {
          if (err) return callback('bad_request', null);
          return callback(null, deletedValidatorsOperatorAddresses);
        }
      )
    })
    .catch(err => callback(err, null))
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', validatorSchema);

export default Validator;
