
import async from 'async';

import mongoose, { Schema, Model, Validator, SortOrder } from 'mongoose';
import CompositeEventBlock from '../CompositeEventBlock/CompositeEventBlock.js';
import Chain, { ChainInterface } from '../Chain/Chain.js';

import { isOperatorAddressValid } from '../../utils/validationFunctions.js';
import { getCsvExportData } from './functions/getCsvExportData.js';
import { formatTimestamp } from '../../utils/formatTimestamp.js';
import { getPubkeysOfActiveValidatorsByHeight } from '../../utils/getPubkeysOfActiveValidatorsByHeight.js';
import ActiveValidators, { ActiveValidatorsInterface } from '../ActiveValidators/ActiveValidators.js';
import { getPercentageSold, getPercentageSoldWithoutRounding } from './functions/getPercentageSold.js';

export interface GraphDataInterface {
  _id: {
    year: number;
    month?: number;
    day?: number;
  },
  data: {
    self_stake_sum: number;
    reward_sum: number;
    commission_sum: number;
    total_stake_sum: number;
    total_sold: number;
    percentage_sold: number;  
  }
}[]


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
      pubkey?: string;
      operator_address: string;
      delegator_address?: string;
      chain_identifier: string;
      moniker: string;
      website: string;
      description: string;
      security_contact: string;
      commission_rate: string;
      keybase_id: string;
      created_at?: Date;
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
      results: {
        summary_data: {
          initial_total_stake_sum: number;
          initial_total_withdraw_sum: number;
          initial_total_sold: number;
          total_sold: number;
          initial_percentage_sold: number;
          percentage_sold: number;
          initial_self_stake_sum: number;
          self_stake_sum: number;
          initial_average_self_stake_ratio: number;
          average_self_stake_ratio: number;
        } | null,
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
          self_stake_ratio: number,
          average_total_stake: number
        }[] | null
      } | null
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
  exportCsvForAllRanges: (
    body: {
      chain_identifier?: string;
      sort_by: 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold';
      order: SortOrder;
      bottom_timestamp?: number | null;
      top_timestamp?: number | null;
    },
    callback: (
      err: string | null,
      rangeToCsvDataMapping: Record<string, any> | null
    ) => any
  ) => any
  getSummaryGraphData: (
    body: {
      chain_identifier: string;
      bottom_timestamp: number;
      top_timestamp: number;
    },
    callback: (
      err: string | null,
      summaryGraphData: GraphDataInterface | null
    ) => any
  ) => any;
  getSmallGraphData: (
    body: {
      chain_identifier: string;
      bottom_timestamp: number;
      top_timestamp: number;
    },
    callback: (
      err: string | null,
      smallGraphData: {
        self_stake_amount: number;
        average_self_stake_ratio: number;
      }[] | null
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

      let totalSelfStaked = 0;
      let initialTotalSelfStaked = 0;

      let totalWithdrawnValidator = 0;
      let initialTotalWithdrawnValidator = 0;

      let totalDelegation = 0;
      let initialTotalDelegation = 0;

      let totalWithdrawn = 0;
      let initialTotalWithdrawn = 0;
      
      let totalSelfStakeRatio = 0;
      let initialTotalSelfStakeRatio = 0;

      let totalPercentageSold = 0;
      let initialTotalPercentageSold = 0;
      let percentageSoldInvolvedValidatorCount = 0;

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
        const {
          self_stake = 0,
          reward = 0,
          commission = 0,
          total_stake = 0,
          total_withdraw = 0,
          balance_change = 0,
          initial_commission_prefix_sum = 0,
          initial_reward_prefix_sum = 0,
          initial_self_stake_prefix_sum = 0,
          initial_total_stake_prefix_sum = 0,
          initial_total_withdraw_prefix_sum = 0,
          average_total_stake = 0
        } = validatorRecordMapping[eachValidator.operator_address] || {};

        const ratio = (self_stake || 0) / ((reward + commission) || (10 ** CHAIN_TO_DECIMALS_MAPPING[`${chain_identifier}`]));
        const sold = balance_change * -1;
        const initial_sold = ((initial_reward_prefix_sum + initial_commission_prefix_sum) || 0) - (initial_self_stake_prefix_sum || 0);

        const percentage_sold = getPercentageSoldWithoutRounding({ sold, self_stake, total_withdraw: reward + commission });

        if ((reward + commission) != 0) {
          totalPercentageSold += getPercentageSold({ sold, self_stake, total_withdraw: reward + commission });;
          percentageSoldInvolvedValidatorCount++;
        }
        

        const initial_percentage_sold = Math.min(
          Math.max(
            ((initial_sold <= 0 ? 0 : initial_sold) / ((initial_reward_prefix_sum + initial_commission_prefix_sum) || 1) * 100), 
            0
          ), 
          100
        );

        const self_stake_ratio = Math.min(Math.abs(self_stake / (total_stake || 1)), 1) * 100;
        const initial_self_stake_ratio = Math.min(Math.abs(initial_self_stake_prefix_sum / (initial_total_stake_prefix_sum || 1)), 1) * 100;

        totalDelegation += total_stake;
        initialTotalDelegation += initial_total_stake_prefix_sum;
        
        totalWithdrawn += (reward + commission);
        initialTotalWithdrawn += (initial_reward_prefix_sum + initial_commission_prefix_sum);
        
        totalSelfStaked += self_stake;
        initialTotalSelfStaked += initial_self_stake_prefix_sum;

        totalWithdrawnValidator += (reward + commission);
        initialTotalWithdrawnValidator += (initial_reward_prefix_sum + initial_commission_prefix_sum);

        totalSelfStakeRatio += self_stake_ratio;
        initialTotalSelfStakeRatio += initial_self_stake_ratio;

        initialTotalPercentageSold += initial_percentage_sold;

        const pushObjectData = {
          pubkey: eachValidator.pubkey || '',
          operator_address: eachValidator.operator_address || '',
          moniker: eachValidator.moniker || '',
          website: eachValidator.website || '',
          commission_rate: eachValidator.commission_rate || '',
          description: eachValidator.description || '',
          temporary_image_uri: eachValidator.temporary_image_uri,
          self_stake, initial_self_stake_prefix_sum,
          reward, initial_reward_prefix_sum,
          commission, initial_commission_prefix_sum,
          total_stake, initial_total_stake_prefix_sum,
          total_withdraw: (reward + commission),
          initial_total_withdraw_prefix_sum: (initial_reward_prefix_sum + initial_commission_prefix_sum),
          percentage_sold, initial_percentage_sold,
          self_stake_ratio, initial_self_stake_ratio,
          average_total_stake: average_total_stake,
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
      
      valueArray.sort((a: any, b: any) => {
        const valA = a[sort_by] || 0;
        const valB = b[sort_by] || 0;
    
        if (valA == valB && sort_by == 'percentage_sold') {
            const secA = a['average_total_stake'] || 0;
            const secB = b['average_total_stake'] || 0;
            return (order == 'asc' || order == 1)
                ? secB - secA
                : secA - secB;
        }
    
        return (order == 'desc' || order == -1)
            ? valB - valA
            : valA - valB;
      });

      callback(null, {
        summary_data: {
          initial_total_stake_sum: initialTotalDelegation,
          initial_total_withdraw_sum: initialTotalWithdrawn,
          total_sold: totalWithdrawnValidator - totalSelfStaked,
          initial_total_sold: initialTotalWithdrawnValidator - initialTotalSelfStaked,
          initial_percentage_sold: (((initialTotalWithdrawnValidator - initialTotalSelfStaked) / initialTotalWithdrawnValidator) * 100),
          percentage_sold: (totalPercentageSold / percentageSoldInvolvedValidatorCount),
          initial_self_stake_sum: (initialTotalPercentageSold / valueArray.length),
          self_stake_sum: totalSelfStaked,
          initial_average_self_stake_ratio: initialTotalSelfStakeRatio / valueArray.length,
          average_self_stake_ratio: totalSelfStakeRatio / valueArray.length
        },
        validators: valueArray
      });
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
  const { sort_by, order, bottom_timestamp, top_timestamp, range = 1, chain_identifier } = body;

  let bottomTimestamp = bottom_timestamp ? bottom_timestamp : 0;
  const topTimestamp = top_timestamp ? top_timestamp : 2e9;

  const timestampDifference = topTimestamp - bottomTimestamp;
  if ((timestampDifference / range) > 50 && range != 0) return callback('bad_request', null);

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
      }, (err, results) => {
        if (err || !results) return next();

        const { validators } = results;
        
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

validatorSchema.statics.exportCsvForAllRanges = function(
  body: Parameters<ValidatorModel['exportCsvForAllRanges']>[0], 
  callback: Parameters<ValidatorModel['exportCsvForAllRanges']>[1]
) {
  const { sort_by, order, bottom_timestamp, top_timestamp, chain_identifier } = body;

  const rangeArray = [
    { id: 'all_time', range: 0 },
    { id: 'weekly', range: 7 * 86400 * 1000 },
    { id: 'monthly', range: 30 * 86400 * 1000 },
    { id: 'yearly', range: 365 * 86400 * 1000 },
  ];

  const rangeToCsvDataMapping: Record<string, any> = {};

  async.timesSeries(
    rangeArray.length,
    (i, next) => {
      Validator.exportCsv({
        sort_by: sort_by,
        order: order,
        bottom_timestamp: bottom_timestamp,
        top_timestamp: top_timestamp,
        chain_identifier: chain_identifier,
        range: rangeArray[i].range
      }, (err, csvDataMapping) => {
        if (err) return next();
        rangeToCsvDataMapping[rangeArray[i].id] = csvDataMapping;
        return next();
      })
    },
    (err: any) => {
      if (err) return callback(err, null);
      return callback(null, rangeToCsvDataMapping);
    }
  )
}

validatorSchema.statics.getSummaryGraphData = function (
  body: Parameters<ValidatorModel['getSummaryGraphData']>[0],
  callback: Parameters<ValidatorModel['getSummaryGraphData']>[1],
) {
  const { chain_identifier, bottom_timestamp, top_timestamp } = body;

  const numberOfDataPoints = 90;
  const intervalMs = Math.ceil((top_timestamp - bottom_timestamp) / numberOfDataPoints);
  
  const groupId: Record<string, any> = {
    bucket: {
      $floor: {
        $divide: [{ $toLong: '$timestamp' }, intervalMs]
      }
    }
  };

  const startBucket = Math.floor(bottom_timestamp / intervalMs);

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
        total_stake_sum: { $sum: '$total_stake' },
        balance_change_sum: { $sum: '$balance_change' },
      }
    },
    {
      $addFields: {
        total_sold: {
          $max: [
            {
              $subtract: [
                {
                  $multiply: [
                    -1,
                    '$balance_change_sum'
                  ]
                },
                '$self_stake_sum'
              ]
            },
            0
          ]
        },
        percentage_sold: {
          $multiply: [
            100,
            {
              $max: [
                {
                  $min: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            { $add: ['$reward_sum', '$commission_sum'] },
                            '$self_stake_sum'
                          ]
                        },
                        {
                          $cond: [
                            { $eq: [{ $add: ['$reward_sum', '$commission_sum'] }, 0] },
                            1,
                            { $add: ['$reward_sum', '$commission_sum'] }
                          ]
                        }
                      ]
                    },
                    1
                  ]
                },
                0
              ]
            }
          ]
        }
      }
    },
    {
      $sort: {
        timestamp: 1
      }
    },
  ])
    .hint({ chain_identifier: 1, timestamp: 1, self_stake: 1, reward: 1, commission: 1, total_stake: 1, balance_change: 1 })
    .then((buckets: any) => {

      const result: any = [];

      let lastValue: any = null;
      for (let i = 0; i < numberOfDataPoints; i++) {
        const bucketIndex = startBucket + i;
        const found = buckets.find((b: any) => b._id.bucket === bucketIndex);

        if (found) {
          lastValue = found;
          result.push(found);
        } else {
          
          const fake = {
            _id: { bucket: bucketIndex },
            timestamp: lastValue ? lastValue.timestamp : 0,
            self_stake_sum: 0,
            reward_sum: 0,
            commission_sum: 0,
            total_stake_sum: 0,
            total_sold: 0,
            percentage_sold: lastValue ? lastValue.percentage_sold : 0,
          };
          result.push(fake);
        }
      }
      return callback(null, result);
    })
    .catch(err => callback(err, null))
}


validatorSchema.statics.getSmallGraphData = function (
  body: Parameters<ValidatorModel['getSmallGraphData']>[0],
  callback: Parameters<ValidatorModel['getSmallGraphData']>[1],
) {
  const { chain_identifier, bottom_timestamp, top_timestamp } = body;
  const numberOfColumns = 20;
  const step = (top_timestamp - bottom_timestamp) / numberOfColumns;
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
      $addFields: {
        groupId: {
          $floor: {
            $divide: [
              {
                $subtract: [
                  '$timestamp',
                  bottom_timestamp
                ]
              },
              step
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$groupId',
        timestamp: { $first: '$timestamp' },
        self_stake_sum: { $sum: '$self_stake' },
        total_stake_sum: { $sum: '$total_stake' },
      }
    },
    {
      $addFields: {
        average_self_stake_ratio: {
          $multiply: [
            100,
            {
              $divide: [
                '$self_stake_sum',
                {
                  $cond: [
                    { $eq: ['$total_stake_sum', 0] },
                    1,
                    '$total_stake_sum'
                  ]
                }
              ]
            }
          ]
        },
      }
    },
    {
      $sort: {
        timestamp: 1
      }
    },
  ])
    .hint({ chain_identifier: 1, timestamp: 1, self_stake: 1, reward: 1, commission: 1, total_stake: 1, balance_change: 1 })
    .then(results => callback(null, results))
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
