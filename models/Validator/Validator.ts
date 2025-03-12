
import async from 'async';

import mongoose, { Schema, Model, Validator, SortOrder } from 'mongoose';
import ValidatorChangeEvent from '../ValidatorChangeEvent/ValidatorChangeEvent.js';
import CompositeEventBlock from '../CompositeEventBlock/CompositeEventBlock.js';

import { isOperatorAddressValid, isPubkeyValid } from '../../utils/validationFunctions.js';
import { getCsvExportData } from './functions/getCsvExportData.js';
import { formatTimestamp } from '../../utils/formatTimestamp.js';

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;

export interface ValidatorInterface {
  pubkey: string;
  operator_address: string;
  moniker: string;
  commission_rate: string;
  bond_shares: string;
  liquid_shares: string;
  keybase_id: string;
  temporary_image_uri: string;
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
      keybase_id: string;
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
  rankValidators: (
    body: {
      sort_by: 'self_stake' | 'withdraw' | 'ratio' | 'sold',
      bottom_timestamp: number,
      top_timestamp: number,
      order: SortOrder,
      with_photos?: Boolean,
    },
    callback: (
      err: string | null,
      validators: {
        operator_address: string,
        moniker: string,
        temporary_image_uri: string,
        self_stake: number,
        withdraw: number,
        ratio: number,
        sold: number
      }[] | null
    ) => any
  ) => any;
  deleteValidatorsNotAppearingOnApiResponse: (
    body: {
      visitedValidatorsOperatorAddresses: string[]
    },
    callback: (
      err: string | null, 
      validatorsMarkedAsDeleted: string[] | Boolean | null
    ) => any
  ) => any;
  exportCsv: (
    body: {
      sort_by: 'self_stake' | 'withdraw' | 'ratio' | 'sold';
      order: SortOrder;
      bottom_timestamp?: number | null;
      top_timestamp?: number | null;
      range?: number;
    },
    callback: (
      err: string | null,
      csvDataMapping: any | null
    ) => any
  ) => any
}

const validatorSchema = new Schema<ValidatorInterface>({
  pubkey: { 
    type: String, 
    required: true,
    trim: true,
    index: 1,
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
    trim: true,
    index: 1,
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
    trim: true,
    index: 1,
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
  keybase_id: {
    type: String,
    required: true,
    trim: true
  },
  temporary_image_uri: {
    type: String,
    required: false
  },
  created_at: { 
    type: Date, 
    default: new Date() 
  },
  deleted_at: { 
    type: Date, 
    index: 1,
    default: null
  }
});

validatorSchema.index({ pubkey: 1, operator_address: 1, moniker: 1, deleted_at: 1 }, { unique: true });


validatorSchema.statics.saveValidator = function (
  body: Parameters<ValidatorModel['saveValidator']>[0], 
  callback: Parameters<ValidatorModel['saveValidator']>[1],
) {
  if (!body.pubkey) return callback('bad_request', null);

  const { pubkey, operator_address, moniker, commission_rate, bond_shares, liquid_shares, keybase_id } = body;

  if (!isOperatorAddressValid(operator_address) || !isPubkeyValid(pubkey)) return callback('format_error', null);

  Validator
    .findOne({
      operator_address: operator_address,
      deleted_at: null
    })
    .then(oldValidator => { 
      if (!oldValidator) {
        return Validator
          .create(body)
          .then((newValidator: ValidatorInterface) => {
            if (!newValidator) return callback('creation_error', null);
            return callback(null, newValidator);
          })
          .catch(err => callback(err, null))
      }

      const updateAndChangeValidatorBody = {
        operator_address: operator_address,
        moniker: moniker,
        commission_rate: commission_rate,
        bond_shares: bond_shares,
        liquid_shares: liquid_shares,
        keybase_id: keybase_id
      }

      return ValidatorChangeEvent.saveValidatorChangeEvent(updateAndChangeValidatorBody, (err, newValidatorChangeEvent) => {
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
      { deleted_at: new Date()  }
    )
    .then((deletedValidator) => {
      if (!deletedValidator) return callback('bad_request', null);

      deletedValidator.moniker = deletedValidator.moniker + '-deactived-' + (new Date(deletedValidator.deleted_at)).toLocaleDateString('en-GB');
      deletedValidator.save();

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

validatorSchema.statics.rankValidators = function (
  body: Parameters<ValidatorModel['rankValidators']>[0], 
  callback: Parameters<ValidatorModel['rankValidators']>[1],
) {

  const { sort_by, order, bottom_timestamp, top_timestamp, with_photos } = body;

  const validatorsArray: {
    operator_address: string,
    moniker: string,
    temporary_image_uri: string,
    self_stake: number,
    withdraw: number,
    ratio: number,
    sold: number
  }[] = [];

  Validator.find({
    created_at: { $lte: new Date(top_timestamp * 1000) },
    $or: [
      { deleted_at: { $gte: new Date(bottom_timestamp * 1000) } },
      { deleted_at: null }
    ]
  })
  .then((validators) => {
    async.timesSeries(
      validators.length,
      (i, next) => {
        const eachValidator: any = validators[i];

        const adjustedDeletedAt = eachValidator.deleted_at ? eachValidator.deleted_at : new Date();

        const bottomTimestamp = new Date(bottom_timestamp * 1000) < eachValidator.created_at ? new Date(eachValidator.created_at).getTime() : bottom_timestamp * 1000;
        const topTimestamp = new Date(top_timestamp * 1000) > adjustedDeletedAt ? new Date(adjustedDeletedAt).getTime() : top_timestamp * 1000

        CompositeEventBlock
          .getTotalPeriodicSelfStakeAndWithdraw(
            {
              operator_address: eachValidator.operator_address,
              bottomTimestamp: bottomTimestamp,
              topTimestamp: topTimestamp,
              searchBy: 'timestamp'
            },
            (err, totalPeriodicSelfStakeAndWithdraw) => {
              if (err) return callback('bad_request', null)
              const selfStake = totalPeriodicSelfStakeAndWithdraw?.self_stake;
              const withdraw = totalPeriodicSelfStakeAndWithdraw?.withdraw;
              const ratio = (totalPeriodicSelfStakeAndWithdraw?.self_stake ? totalPeriodicSelfStakeAndWithdraw?.self_stake : 0) / (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : 1);
              const sold = (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : 0) - (totalPeriodicSelfStakeAndWithdraw?.self_stake ? totalPeriodicSelfStakeAndWithdraw?.self_stake : 0);

              const pushObjectData = {
                operator_address: eachValidator.operator_address,
                moniker: eachValidator.moniker,
                temporary_image_uri: eachValidator.temporary_image_uri,
                self_stake: selfStake ? selfStake : 0,
                withdraw: withdraw ? withdraw : 0,
                ratio: ratio,
                sold: sold
              };

              if (!with_photos) delete pushObjectData.temporary_image_uri;
              validatorsArray.push(pushObjectData);
              return next()
            }
          )
      }, 
      (err) => {
        if (err) return callback('bad_request', null);
        order == 'desc'
          ? validatorsArray.sort((a: any, b: any) => (b[sort_by] || 0) - (a[sort_by] || 0))
          : validatorsArray.sort((a: any, b: any) => (a[sort_by] || 0) - (b[sort_by] || 0))

        return callback(null, validatorsArray)
      }
    )
  }).catch(err => callback('bad_request', null));
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
      if (!validators.length) return callback(null, true);
      async.timesSeries(
        validators.length,
        (i, next) => {
          const eachValidatorToBeDeleted = validators[i];
          Validator.deleteValidator({ operator_address: eachValidatorToBeDeleted.operator_address }, (err, validator) => {
            if (!err && validator) deletedValidatorsOperatorAddresses.push(validator.operator_address);
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


validatorSchema.statics.exportCsv = function (
  body: Parameters<ValidatorModel['exportCsv']>[0], 
  callback: Parameters<ValidatorModel['exportCsv']>[1]
) {
  const { sort_by, order, bottom_timestamp, top_timestamp, range } = body;

  let bottomTimestamp = bottom_timestamp ? bottom_timestamp : 0;
  const topTimestamp = top_timestamp ? top_timestamp : 2e9;
  const timestampRange = Math.min((topTimestamp - bottomTimestamp), (range ? range : (topTimestamp - bottomTimestamp)));

  const csvDataMapping: any = {};

  async.whilst(
    function test(cb) { cb(null, bottomTimestamp < topTimestamp); },
    function iter(next) {
      Validator.rankValidators({
        sort_by: sort_by,
        order: order,
        bottom_timestamp: bottomTimestamp,
        top_timestamp: bottomTimestamp + timestampRange,
        with_photos: false
      }, (err, validators) => {

        if (err || !validators) return next();
        csvDataMapping[`validator-ranking-${formatTimestamp(bottomTimestamp)}_${formatTimestamp(bottomTimestamp + timestampRange)}.csv`] = validators;
        bottomTimestamp += timestampRange;
        return next();
      })
    },
    function (err) {
      if (err) return callback('async_error', null);
      getCsvExportData(csvDataMapping, (err, csvExportData) => {
        if (err) return callback('bad_request', null);
        return callback(null, csvExportData);
      })
    }
  )
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', validatorSchema);

export default Validator;
