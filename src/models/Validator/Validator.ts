
import async from 'async';

import mongoose, { Schema, Model, Validator, SortOrder } from 'mongoose';
import CompositeEventBlock from '../CompositeEventBlock/CompositeEventBlock.js';
import Chain, { ChainInterface } from '../Chain/Chain.js';

import { isOperatorAddressValid } from '../../utils/validationFunctions.js';
import { getCsvExportData } from './functions/getCsvExportData.js';
import { formatTimestamp } from '../../utils/formatTimestamp.js';
import { getPubkeysOfActiveValidatorsByHeight } from '../../utils/getPubkeysOfActiveValidatorsByHeight.js';
import ActiveValidators, { ActiveValidatorsInterface } from '../ActiveValidators/ActiveValidators.js';
import { NUMBER_OF_COLUMNS } from '../../controllers/Validator/getGraphData/get.js';
import { GraphDataInterface } from '../CacheSummaryGraph/CacheSummaryGraph.js';

const MAX_DATABASE_TEXT_FIELD_LENGTH = 1e4;
const CHAIN_TO_DECIMALS_MAPPING: Record<string, any> = {
  'cosmoshub': 6,
  'lava': 6,
  'celestia': 6,
  'osmosis': 6,
}

export interface ValidatorInterface {
  pubkey: string;
  operator_address: string;
  delegator_address: string;
  chain_identifier: string;
  moniker: string;
  website: string;
  description: string;
  security_contact: string;
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
      website: string;
      description: string;
      security_contact: string;
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
      website: string;
      description: string;
      security_contact: string;
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
      website: string;
      description: string;
      security_contact: string;
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
      sort_by: 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold',
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
        reward: number,
        commission: number,
        ratio: number,
        sold: number,
        percentage_sold: number,
        self_stake_ratio: number
      }[] | null
    ) => any
  ) => any;
  updateActiveValidatorList: (
    body: {
      chain_rpc_url: string,
      chain_identifier: string,
      height: number,
      day: number,
      month: number,
      year: number,
      active_validators_pubkeys_array: string[] | null;
    },
    callback: (
      err: string | null,
      savedActiveValidators: ActiveValidatorsInterface | null
    ) => any
  ) => any;
  exportCsv: (
    body: {
      chain_identifier?: string;
      sort_by: 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold';
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
  getSummaryGraphData: (
    body: {
      chain_identifier: string;
      bottom_timestamp: number;
      top_timestamp: number;
      by: string;
    },
    callback: (
      err: string | null,
      summaryGraphData: GraphDataInterface | null
    ) => any
  ) => any;
  updateLastVisitedBlock: (
    body: { chain_identifier: string, block_height?: number, block_time?: Date },
    callback: (
      err: string | null,
      updated_chain: ChainInterface | null
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
    index: 1,
    minlength: 1,
    maxlength: MAX_DATABASE_TEXT_FIELD_LENGTH
  },
  website: { 
    type: String, 
    trim: true,
    required: false
  },
  description: { 
    type: String, 
    trim: true,
    required: false
  },
  security_contact: { 
    type: String, 
    trim: true,
    required: false
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
  const { operator_address, moniker, commission_rate, keybase_id, chain_identifier, description, security_contact, website } = body;
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
        keybase_id: keybase_id,
        website: website,
        description: description,
        security_contact: security_contact
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
            .catch(err => callback(`database_error: ${err}`, null))
        })
        .catch(err => callback(`database_error: ${err}`, null))
    })
    .catch(err => callback(`database_error: ${err}`, null))
}



validatorSchema.statics.updateValidator = function (
  body: Parameters<ValidatorModel['updateValidator']>[0], 
  callback: Parameters<ValidatorModel['updateValidator']>[1],
) {
  
  const { operator_address, moniker, commission_rate, keybase_id, website, security_contact, description } = body;
  
  Validator
    .findOneAndUpdate(
      { operator_address: operator_address },
      {
        moniker: moniker,
        commission_rate: commission_rate,
        keybase_id: keybase_id,
        website: website,
        security_contact: security_contact,
        description: description
      }  
    )
    .then(validator => {
      if (!validator) return callback('bad_request', null);
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

  if (!chain_identifier) return callback('bad_request', null);

  Promise.allSettled([
    new Promise((resolve, reject) => {
      Validator.find({
        chain_identifier: chain_identifier ? chain_identifier : 'cosmoshub',
        created_at: { $lte: new Date(top_timestamp) }
      })
      .then((validators) => resolve(validators))
      .catch(err => reject(err));
    }),
    new Promise((resolve, reject) => {
      CompositeEventBlock.getPeriodicDataForValidatorSet({
        chain_identifier: chain_identifier,
        bottom_timestamp: bottom_timestamp,
        top_timestamp: top_timestamp
      }, (err, validatorRecordMapping) => {
        if (err) return reject(err);
        return resolve(validatorRecordMapping);
      })
    }),
  ])
    .then((results: Record<string, any>[]) => {
      const [validatorsResult, getPeriodicDataForValidatorSetResult] = results;
      if (
        validatorsResult.status == 'rejected' || 
        getPeriodicDataForValidatorSetResult.status == 'rejected'
      ) return callback('bad_request', null);
      
      const validators = validatorsResult.value;
      const validatorRecordMapping = getPeriodicDataForValidatorSetResult.value;

      const valueArray = [];

      let index = 0;
      while (index < validators.length) {
        const i = index;
        const eachValidator: any = validators[i];
        const { self_stake = 0, reward = 0, commission = 0, total_stake = 0, total_withdraw = 0 } = validatorRecordMapping[eachValidator.operator_address] || {};

        const ratio = (self_stake || 0) / ((reward + commission) || (10 ** CHAIN_TO_DECIMALS_MAPPING[`${chain_identifier}`]));
        const sold = ((reward + commission) || 0) - (self_stake || 0);
        const percentage_sold = Math.min(Math.abs((sold || 1) / ((reward + commission) || 1)), 1) * 100;
        const self_stake_ratio = Math.min(Math.abs(self_stake / (total_stake || 1)), 1) * 100;

        const pushObjectData = {
          pubkey: eachValidator.pubkey || '',
          operator_address: eachValidator.operator_address || '',
          moniker: eachValidator.moniker || '',
          website: eachValidator.website || '',
          commission_rate: eachValidator.commission_rate || '',
          description: eachValidator.description || '',
          temporary_image_uri: eachValidator.temporary_image_uri,
          self_stake: self_stake,
          reward: reward,
          commission: commission,
          total_stake: total_stake,
          total_withdraw: total_withdraw,
          percentage_sold: percentage_sold,
          self_stake_ratio: self_stake_ratio,
          chain_identifier: chain_identifier,
          ratio: ratio,
          sold: sold
        };
        
        if (!with_photos) {
          delete eachValidator.website;
          delete eachValidator.description;
          delete pushObjectData.temporary_image_uri;
        }
        valueArray.push(pushObjectData);
        index++;
      }

      (order == 'desc' || order == -1)
        ? valueArray.sort((a: any, b: any) => (b[sort_by] || 0) - (a[sort_by] || 0))
        : valueArray.sort((a: any, b: any) => (a[sort_by] || 0) - (b[sort_by] || 0));

      callback(null, valueArray);
    })
}

validatorSchema.statics.updateActiveValidatorList = async function (
  body: Parameters<ValidatorModel['updateActiveValidatorList']>[0],
  callback: Parameters<ValidatorModel['updateActiveValidatorList']>[1]
) {

  const { chain_identifier, chain_rpc_url, height, day, month, year, active_validators_pubkeys_array } = body;
 
  if (active_validators_pubkeys_array && active_validators_pubkeys_array.length > 0) {
    return ActiveValidators.saveActiveValidators({
      chain_identifier: chain_identifier,
      month: month + 1,
      year: year,
      day: day,
      active_validators_pubkeys_array: active_validators_pubkeys_array
    }, (err, savedActiveValidators) => {
      if (err) return callback(err, null);
      return callback(null, savedActiveValidators);    
    })
  }

  return getPubkeysOfActiveValidatorsByHeight(chain_rpc_url, height, (err, pubkeysOfActiveValidators) => {
    if (err || !pubkeysOfActiveValidators) return callback(err, null);
    
    ActiveValidators.saveActiveValidators({
      chain_identifier: chain_identifier,
      month: month + 1,
      year: year,
      day: day,
      active_validators_pubkeys_array: pubkeysOfActiveValidators
    }, (err, savedActiveValidators) => {
      if (err) return callback(err, null);
      return callback(null, savedActiveValidators);    
    })
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


validatorSchema.statics.getSummaryGraphData = function (
  body: Parameters<ValidatorModel['getSummaryGraphData']>[0],
  callback: Parameters<ValidatorModel['getSummaryGraphData']>[1],
) {
  const { chain_identifier, bottom_timestamp, top_timestamp, by } = body;

  const groupId: Record<string, any> = { year: '$year' };
  if (by == 'm' || by == 'd') groupId.month = '$month';
  if (by === 'd') 
    groupId.day = {
      $floor: {
        $divide: ['$day', 4]
      }
    };
  
  CompositeEventBlock.aggregate([
    {
      $match: {
        chain_identifier: chain_identifier,
        timestamp: {
          $gte: bottom_timestamp,
          $lte: top_timestamp,
        },
      },
    },
    {
      $group: {
        _id: groupId,
        timestamp: { $first: '$timestamp' },
        self_stake_sum: { $sum: '$self_stake' },
        reward_sum: { $sum: '$reward' },
        commission_sum: { $sum: '$commission' },
      }
    },
    {
      $sort: {
        timestamp: 1
      }
    },
  ])
    .hint({ chain_identifier: 1, timestamp: 1, self_stake: 1, reward: 1, commission: 1 })
    .then((results: any) => { 
      return callback(null, results)
    })
    .catch(err => callback(err, null))
}


validatorSchema.statics.updateLastVisitedBlock = function (
  body: Parameters<ValidatorModel['updateLastVisitedBlock']>[0],
  callback: Parameters<ValidatorModel['updateLastVisitedBlock']>[1]
) {
  const { chain_identifier, block_height, block_time } = body;

  Chain
    .findOneAndUpdate(
      { name: chain_identifier },
      { last_visited_block: block_height, last_visited_block_time: block_time }
    )
    .then(updatedChain => {
      if (!updatedChain) return callback('database_error', null);
      return callback(null, updatedChain);
    })
    .catch(err => callback(err, null))
}


const Validator = mongoose.model<ValidatorInterface, ValidatorModel>('Validators', validatorSchema);

export default Validator;
