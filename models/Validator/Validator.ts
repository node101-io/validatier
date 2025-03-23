
import async from 'async';

import mongoose, { Schema, Model, Validator, SortOrder } from 'mongoose';
import CompositeEventBlock from '../CompositeEventBlock/CompositeEventBlock.js';
import Chain, { ChainInterface } from '../Chain/Chain.js';

import { isOperatorAddressValid } from '../../utils/validationFunctions.js';
import { getCsvExportData } from './functions/getCsvExportData.js';
import { formatTimestamp } from '../../utils/formatTimestamp.js';
import { getPubkeysOfActiveValidatorsByHeight } from '../../utils/getPubkeysOfActiveValidatorsByHeight.js';
import ValidatorStatus, { ValidatorStatusInterface } from '../ValidatorStatus/ValidatorStatus.js';

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;

export interface ValidatorInterface {
  pubkey: string;
  operator_address: string;
  delegator_address: string;
  chain_identifier: string;
  moniker: string;
  commission_rate: string;
  keybase_id: string;
  temporary_image_uri: string;
  created_at: Date;
}

interface ValidatorModel extends Model<ValidatorInterface> {
  saveValidator: (
    body: {
      pubkey: string;
      operator_address: string;
      delegator_address: string;
      chain_identifier: string;
      moniker: string;
      commission_rate: string;
      keybase_id: string;
      created_at: Date;
    }, 
    callback: (
      err: string | null,
      newValidator: ValidatorInterface | null
    ) => any
  ) => any;
  saveManyValidators: (
    body: Record<string, {
      pubkey: string;
      operator_address: string;
      delegator_address: string;
      chain_identifier: string;
      moniker: string;
      commission_rate: string;
      keybase_id: string;
      created_at: Date;
    }>,
    callback: (
      err: string | null,
      validators: {
        insertedValidators: ValidatorInterface[] | null,
        updatedValidators: ValidatorInterface[] | null
      } | null
    ) => any
  ) => any;
  updateValidator: (
    body: {
      operator_address: string;
      moniker: string;
      commission_rate: string;
      keybase_id: string;
    }, 
    callback: (
      err: string | null,
      updatedValidator: ValidatorInterface | null
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
      chain_identifier?: string;
      sort_by: 'self_stake' | 'withdraw' | 'ratio' | 'sold' | 'total_stake' | 'total_withdraw',
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
  deleteValidatorsNotAppearingActiveSet: (
    body: {
      activeValidatorsPubkeys: string[],
      chain_identifier: string,
      block_time: Date
    },
    callback: (
      err: string | null, 
      validatorsRestoredAndDeleted: {
        deleted: string[],
        restored: string[]
      } | null
    ) => any
  ) => any;
  updateActiveValidatorList: (
    body: {
      chain_rpc_url: string,
      chain_identifier: string,
      height: number,
      block_time: Date
    },
    callback: (
      err: string | null,
      validatorsRestoredAndDeleted: {
        deleted: string[],
        restored: string[]
      } | null
    ) => any
  ) => any;
  exportCsv: (
    body: {
      chain_identifier?: string;
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
  ) => any;
  updateLastVisitedBlock: (
    body: { chain_identifier: string, block_height?: number, block_time?: Date },
    callback: (
      err: string | null,
      chain: ChainInterface | null
    ) => any
  ) => any;
}

const validatorSchema = new Schema<ValidatorInterface>({
  pubkey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: 1
  },
  operator_address: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    index: 1
  },
  delegator_address: { 
    type: String, 
    required: false, 
    unique: true,
    trim: true,
    index: 1
  },
  chain_identifier: {
    type: String,
    required: true,
    trim: true
  },
  moniker: { 
    type: String, 
    required: true,
    trim: true,
    unique: true,
    index: 1,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  commission_rate: { 
    type: String, 
    required: true,
    trim: true
  },
  keybase_id: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  temporary_image_uri: {
    type: String,
    required: false
  },
  created_at: { 
    type: Date, 
    required: true
  }
});


validatorSchema.statics.saveValidator = function (
  body: Parameters<ValidatorModel['saveValidator']>[0], 
  callback: Parameters<ValidatorModel['saveValidator']>[1],
) {
  const { operator_address, moniker, commission_rate, keybase_id, chain_identifier } = body;
  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  Validator
    .findOne({
      chain_identifier: chain_identifier,
      operator_address: operator_address
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
        keybase_id: keybase_id
      }

      Validator.updateValidator(updateAndChangeValidatorBody, (err, updatedValidator) => {
        if (err) return callback('bad_request', null);
        return callback(null, updatedValidator);
      })
    })
    .catch(err => callback(err, null))
}



validatorSchema.statics.saveManyValidators = function (
  body: Parameters<ValidatorModel['saveManyValidators']>[0],
  callback: Parameters<ValidatorModel['saveManyValidators']>[1],
) {
  const validatorsArray = Object.values(body);
  const operatorAddresses = validatorsArray.map(validator => validator.operator_address);

  Validator
    .find({ operator_address: { $in: operatorAddresses } })
    .then(existingValidators => {

      const existingOperatorAddresses = existingValidators.map(validator => validator.operator_address);
      const newValidators = validatorsArray.filter(validator => !existingOperatorAddresses.includes(validator.operator_address));
      const updateValidators = validatorsArray.filter(validator => existingOperatorAddresses.includes(validator.operator_address));
  
      Validator
        .insertMany(newValidators, { ordered: false })
        .then(insertedValidators => {

          const updateValidatorsBulk = updateValidators.map(validator => ({
            updateOne: {
              filter: { operator_address: validator.operator_address },
              update: { $set: {
                moniker: validator.moniker,
                commission_rate: validator.commission_rate,
                keybase_id: validator.keybase_id
              } }
            }
          }));
      
          Validator
            .bulkWrite(updateValidatorsBulk)
            .then(updatedValidators => {
              return callback(null, { insertedValidators, updatedValidators: Object.values(updatedValidators.insertedIds) })
            })
            .catch(err => callback('database_error', null))
        })
        .catch(err => callback('database_error', null))
    })
    .catch(err => callback('database_error', null))
}



validatorSchema.statics.updateValidator = function (
  body: Parameters<ValidatorModel['updateValidator']>[0], 
  callback: Parameters<ValidatorModel['updateValidator']>[1],
) {
  
  const { operator_address, moniker, commission_rate, keybase_id } = body;
  
  Validator
    .findOne({ operator_address: operator_address })
    .sort({ created_at: -1 })
    .then(validator => {
      if (!validator) return callback('bad_request', null);
      validator.moniker = moniker;
      validator.commission_rate = commission_rate;
      validator.keybase_id = keybase_id;
      validator.save();
      return callback(null, validator);
    })
    .catch(err => callback(err, null));
}

validatorSchema.statics.getValidatorByOperatorAddress = function (
  body: Parameters<ValidatorModel['getValidatorByOperatorAddress']>[0], 
  callback: Parameters<ValidatorModel['getValidatorByOperatorAddress']>[1],
) {

  const { operator_address } = body;

  Validator
    .findOne({ operator_address }) 
    .then((validator) => {
      return callback(null, validator);
    })
    .catch(err => callback(err, null));
}

validatorSchema.statics.rankValidators = function (
  body: Parameters<ValidatorModel['rankValidators']>[0], 
  callback: Parameters<ValidatorModel['rankValidators']>[1],
) {

  const { sort_by, order, bottom_timestamp, top_timestamp, with_photos, chain_identifier } = body;

  const validatorsArray: {
    operator_address: string,
    moniker: string,
    temporary_image_uri: string,
    self_stake: number,
    withdraw: number,
    ratio: number,
    sold: number,
    inactivityIntervals: ValidatorStatusInterface[] | null
  }[] = [];
  const pushedValidatorOperatorAddressArray: string[] = [];

  Validator.find({
    chain_identifier: chain_identifier ? chain_identifier : 'cosmoshub',
    created_at: { $lte: new Date(top_timestamp * 1000) }
  })
  .then((validators) => {
    async.times(
      validators.length,
      (i, next) => {
        const eachValidator: any = validators[i];
        
        CompositeEventBlock
          .getTotalPeriodicSelfStakeAndWithdraw(
            {
              operator_address: eachValidator.operator_address,
              bottomTimestamp: bottom_timestamp,
              topTimestamp: top_timestamp,
              searchBy: 'timestamp'
            },
            (err, totalPeriodicSelfStakeAndWithdraw) => {
              
              if (err) return callback('bad_request', null);
              if (!totalPeriodicSelfStakeAndWithdraw) return next();

              Chain
                .findOne({ name: eachValidator.chain_identifier })
                .then(chain => {
                  if (!chain) return next();

                  const selfStake = totalPeriodicSelfStakeAndWithdraw?.self_stake;
                  const withdraw = totalPeriodicSelfStakeAndWithdraw?.withdraw;
                  const totalStake = totalPeriodicSelfStakeAndWithdraw?.average_total_stake;
                  const totalWithdraw = totalPeriodicSelfStakeAndWithdraw?.average_withdraw;
                  const ratio = (totalPeriodicSelfStakeAndWithdraw?.self_stake ? (totalPeriodicSelfStakeAndWithdraw?.self_stake) : 0) / (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : (10 ** chain?.decimals));
                  const sold = (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : 0) - (totalPeriodicSelfStakeAndWithdraw?.self_stake ? totalPeriodicSelfStakeAndWithdraw?.self_stake : 0);

                  ValidatorStatus.getValidatorStatusHistory(
                    { operator_address: eachValidator.operator_address },
                    (err, validatorStatusHistory) => {

                      if (err) return next(new Error(err));

                      const pushObjectData = {
                        operator_address: eachValidator.operator_address,
                        moniker: eachValidator.moniker,
                        temporary_image_uri: eachValidator.temporary_image_uri,
                        self_stake: selfStake ? selfStake : 0,
                        withdraw: withdraw ? withdraw : 0,
                        total_stake: totalStake ? totalStake : 0,
                        total_withdraw: totalWithdraw ? totalWithdraw : 0,
                        chain_identifier: chain_identifier,
                        chain_id: chain.chain_id,
                        ratio: ratio,
                        sold: sold,
                        inactivityIntervals: validatorStatusHistory
                      };
    
                      if (!with_photos) delete pushObjectData.temporary_image_uri;
    
                      validatorsArray.push(pushObjectData);
                      pushedValidatorOperatorAddressArray.push(pushObjectData.operator_address);
                      return next()
                    }
                  )
                })
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
  })
  .catch(err => callback(err, null));
}


validatorSchema.statics.deleteValidatorsNotAppearingActiveSet = function (
  body: Parameters<ValidatorModel['deleteValidatorsNotAppearingActiveSet']>[0], 
  callback: Parameters<ValidatorModel['deleteValidatorsNotAppearingActiveSet']>[1],
) {

  const { activeValidatorsPubkeys, chain_identifier, block_time } = body;
  const deletedValidatorsOperatorAddresses: string[] = [];
  const restoredValidatorsOperatorAddresses: string[] = [];

  Validator
    .find({ pubkey: { $nin: activeValidatorsPubkeys }, chain_identifier: chain_identifier })
    .then(validators => {

      async.timesSeries(
        validators.length,
        (i, next) => {
          const eachValidatorToBeInactive = validators[i];
          ValidatorStatus.saveValidatorStatus({ 
            operator_address: eachValidatorToBeInactive.operator_address,
            timestamp: (new Date(block_time)).getTime(),
            status: 'inactive',
            action: 'start'
          }, (err, validatorStatusStart) => {
            if (err) return next(new Error(err));
            if (validatorStatusStart) deletedValidatorsOperatorAddresses.push(validatorStatusStart.operator_address);
            return next();
          })
        },
        (err) => {
          if (err) return callback('bad_request', null);

          Validator
            .find({ operator_address: { $in: activeValidatorsPubkeys }, chain_identifier: chain_identifier })
            .then(restorableValidators => {
              if (!restorableValidators.length) return callback(null, { deleted: deletedValidatorsOperatorAddresses, restored: restoredValidatorsOperatorAddresses });
      
              async.timesSeries(
                restorableValidators.length,
                (i, next) => {
                  const eachValidatorToRestore = restorableValidators[i];
                  
                  ValidatorStatus.saveValidatorStatus({
                    operator_address: eachValidatorToRestore.operator_address,
                    timestamp: (new Date(block_time)).getTime(),
                    status: 'inactive',
                    action: 'finish'
                  }, (err, validatorStatusFinish) => {
                    if (err) return next(new Error(err));
                    if (validatorStatusFinish) restoredValidatorsOperatorAddresses.push(validatorStatusFinish.operator_address);
                    return next();
                  })
                },
                (err) => {
                  if (err) return callback('bad_request', null);
                  return callback(null, { deleted: deletedValidatorsOperatorAddresses, restored: restoredValidatorsOperatorAddresses });
                }
              );
            })
            .catch(err => callback(err, null));
        }
      );
    })
    .catch(err => callback(err, null));
  
}


validatorSchema.statics.updateActiveValidatorList = async function (
  body: Parameters<ValidatorModel['updateActiveValidatorList']>[0],
  callback: Parameters<ValidatorModel['updateActiveValidatorList']>[1]
) {

  const { chain_identifier, chain_rpc_url, height, block_time } = body;
 
  getPubkeysOfActiveValidatorsByHeight(chain_rpc_url, height, (err, pubkeysOfActiveValidators) => {
    if (err || !pubkeysOfActiveValidators) return callback(err, null);
    Validator.deleteValidatorsNotAppearingActiveSet(
      {
        chain_identifier: chain_identifier,
        activeValidatorsPubkeys: pubkeysOfActiveValidators,
        block_time: block_time
      },
      (err, validatorsRestoredAndDeleted) => {
        if (err) return callback(err, null);
        return callback(null, validatorsRestoredAndDeleted)
      }
    );
  });
};


validatorSchema.statics.exportCsv = function (
  body: Parameters<ValidatorModel['exportCsv']>[0], 
  callback: Parameters<ValidatorModel['exportCsv']>[1]
) {
  const { sort_by, order, bottom_timestamp, top_timestamp, range, chain_identifier } = body;

  let bottomTimestamp = bottom_timestamp ? bottom_timestamp : 0;
  const topTimestamp = top_timestamp ? top_timestamp : 2e9;
  const timestampRange = Math.min((topTimestamp - bottomTimestamp), (range ? range : (topTimestamp - bottomTimestamp)));

  const csvDataMapping: any = {};

  async.whilst(
    function test(cb) { cb(null, bottomTimestamp < topTimestamp); },
    function iter(next) {
      Validator.rankValidators({
        chain_identifier: chain_identifier,
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

validatorSchema.statics.updateLastVisitedBlock = function (
  body: Parameters<ValidatorModel['updateLastVisitedBlock']>[0],
  callback: Parameters<ValidatorModel['updateLastVisitedBlock']>[1]
) {
  const { chain_identifier, block_height, block_time } = body;

  Chain
    .findOneAndUpdate(
      { name: chain_identifier },
      { last_visited_block: block_height }
    )
    .then(updatedChain => {
      if (!updatedChain) return callback('database_error', null);
      
      if (
        updatedChain.last_visited_block - updatedChain.active_set_last_updated_block_height < 3000 || 
        !block_time
      ) return callback(null, updatedChain);
    
      Validator.updateActiveValidatorList({ 
        chain_identifier: updatedChain.name, 
        chain_rpc_url: updatedChain.rpc_url, 
        height: updatedChain.last_visited_block, 
        block_time: block_time 
      }, (err, validatorsUpdatedOrRestored) => {
        if (err) return callback('database_error', null);
        console.log('ACTIVE VALIDATOR LIST UPDATED')
        console.log(`VALIDATORS ACTIVATED: ${validatorsUpdatedOrRestored?.restored}`);
        console.log(`VALIDATORS DEACTIVATED: ${validatorsUpdatedOrRestored?.deleted}`);
        
        updatedChain.active_set_last_updated_block_height = updatedChain.last_visited_block;
        updatedChain.save();
        return callback(null, updatedChain);
      })
    })
    .catch(err => callback('database_error', null))
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', validatorSchema);

export default Validator;
