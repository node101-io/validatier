
import mongoose, { Schema, Model, SortOrder } from 'mongoose';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

const MAX_DENOM_LENGTH = 68;

export interface CompositeEventBlockInterface {
  chain_identifier: string;
  timestamp: number;
  block_height: number;
  operator_address: string;
  denom: string;
  reward: number;
  commission: number;
  self_stake: number;
  total_stake: number;
  total_withdraw: number;
  reward_prefix_sum: number;
  commission_prefix_sum: number;
  self_stake_prefix_sum: number;
  total_stake_prefix_sum: number;
  total_withdraw_prefix_sum: number;
}

interface CompositeEventBlockModel extends Model<CompositeEventBlockInterface> {
  checkIfBlockExistsAndUpdate: (
    body: {
      operator_address: string;
      block_height: number;
      update_body: {
        self_stake?: number;
        reward?: number;
        commission?: number;
        total_stake?: number;
        total_withdraw?: number,
        self_stake_prefix_sum?: number;
        reward_prefix_sum?: number;
        commission_prefix_sum?: number;
        total_stake_prefix_sum?: number;
        total_withdraw_prefix_sum?: number;
      }
    },
    callback: (
      err: string | null,
      updatedCompositeBlockEvent: CompositeEventBlockInterface | null
    ) => any
  ) => any;
  saveCompositeEventBlock: (
    body: {
      chain_identifier: string;
      block_height: number;
      operator_address: string;
      timestamp: number;
      denom: string;
      self_stake?: number;
      reward?: number;
      commission?: number;
      total_stake?: number;
      total_withdraw?: number;
    }, 
    callback: (
      err: string | null,
      newCompositeEventBlock: CompositeEventBlockInterface | null
    ) => any
  ) => any;
  saveManyCompositeEventBlocks: (
    body: Record<string, {
      chain_identifier: string;
      block_height: number;
      operator_address: string;
      timestamp: number;
      denom: string;
      self_stake?: number;
      reward?: number;
      commission?: number;
      total_stake?: number;
      total_withdraw?: number;
    }>, 
    callback: (
      err: string | null,
      savedCompositeEventBlocks: CompositeEventBlockInterface[] | null
    ) => any
  ) => any;
  getPeriodicDataForValidatorSet: (
    body: {
      chain_identifier: string;
      bottom_block_height?: number;
      top_block_height?: number;
      bottom_timestamp: number;
      top_timestamp: number;
      search_by: 'block_height' | 'timestamp';
    },
    callback: (
      err: string | null,
      validatorRecordMapping: Record<string, {
        self_stake: number,
        reward: number,
        commission: number,
        average_total_stake: number,
        average_withdraw: number
      }> | null
    ) => any
  ) => any;
  getPeriodicDataForGraphGeneration: (
    body: {
      operator_address: string;
      bottom_block_height?: number;
      top_block_height?: number;
      bottom_timestamp?: number;
      top_timestamp?: number;
      search_by: 'block_height' | 'timestamp';
    },
    callback: (
      err: string | null,
      validatorRecordMapping: Record<string, {
        self_stake: number,
        reward: number,
        commission: number,
        average_total_stake: number,
        average_withdraw: number
      }> | null
    ) => any
  ) => any;
  searchTillExists: (
    body: {
      operator_address: string;
      block_height?: number;
      timestamp?: number;
      search_by: 'block_height' | 'timestamp';
      order: SortOrder 
    },
    callback: (
      err: string | null,
      foundCompositeBlockEvent: CompositeEventBlockInterface | null
    ) => any
  ) => any;
  getTotalPeriodicSelfStakeAndWithdraw: (
    body: {
      operator_address: string;
      bottomBlockHeight?: number;
      topBlockHeight?: number;
      bottomTimestamp?: number;
      topTimestamp?: number;
      searchBy: 'block_height' | 'timestamp';
    },
    callback: (
      err: string | null,
      totalPeriodicSelfStakeAndWithdraw: {
        self_stake: number,
        reward: number,
        commission: number,
        average_total_stake: number,
        average_withdraw: number
      } | null
    ) => any
  ) => any
}


const compositeEventBlockSchema = new Schema<CompositeEventBlockInterface>({
  chain_identifier: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  block_height: { 
    type: Number, 
    required: true,
  },
  operator_address: {
    type: String,
    required: true,
    trim: true
  },
  denom: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DENOM_LENGTH
  },
  self_stake: { 
    type: Number, 
    required: false,
    default: 0
  },
  reward: { 
    type: Number, 
    required: false,
    default: 0
  },
  commission: {
    type: Number,
    required: false,
    default: 0
  },
  total_stake: {
    type: Number,
    required: false,
    default: 0
  },
  total_withdraw: {
    type: Number,
    required: false,
    default: 0
  },
  self_stake_prefix_sum: {
    type: Number, 
    required: true
  },
  reward_prefix_sum: {
    type: Number, 
    required: true,
  },
  commission_prefix_sum: {
    type: Number,
    required: true
  },
  total_stake_prefix_sum: {
    type: Number,
    required: true
  },
  total_withdraw_prefix_sum: {
    type: Number,
    required: true
  }
});

compositeEventBlockSchema.index({ operator_address: 1, block_height: -1 });
compositeEventBlockSchema.index({ operator_address: 1, timestamp: 1 });
compositeEventBlockSchema.index({ chain_identifier: 1, timestamp: 1, operator_address: 1, block_height: -1 });
compositeEventBlockSchema.index({ chain_identifier: 1, timestamp: 1 });


compositeEventBlockSchema.statics.searchTillExists = function (
  body: Parameters<CompositeEventBlockModel['searchTillExists']>[0],
  callback: Parameters<CompositeEventBlockModel['searchTillExists']>[1]
) {

  const { operator_address, block_height, timestamp, search_by, order } = body;

  if (search_by != 'block_height' && search_by != 'timestamp') return callback('bad_request', null);

  const condition = 
    (order == 'asc' || order == 1)
      ? (search_by == 'block_height' ? { $gt: block_height } : { $gt: timestamp }) 
      : (search_by == 'block_height' ? { $lt: block_height } : { $lt: timestamp });

  const sortBy = 
    (order == 'asc' || order == 1)
      ? 'timestamp'
      : 'block_height';

  CompositeEventBlock
    .find({
      operator_address: operator_address,
      [search_by]: condition
    })
    .sort({ [sortBy]: order })
    .then(compositeEventBlocksOfValidator => {
      if (!compositeEventBlocksOfValidator) return callback(null, null);
      return callback(null, compositeEventBlocksOfValidator[0]);
    })
    .catch(err => callback(err, null));
}

compositeEventBlockSchema.statics.getPeriodicDataForGraphGeneration = function (
  body: Parameters<CompositeEventBlockModel['getPeriodicDataForGraphGeneration']>[0],
  callback: Parameters<CompositeEventBlockModel['getPeriodicDataForGraphGeneration']>[1]
) {

  const { operator_address, bottom_block_height, top_block_height, bottom_timestamp, top_timestamp, search_by } = body;

  if (search_by != 'block_height' && search_by != 'timestamp') return callback('bad_request', null);

  const condition =
    search_by == 'block_height' 
      ? { $gte: bottom_block_height, $lte: top_block_height }
      : { $gte: bottom_timestamp, $lte: top_timestamp };

      CompositeEventBlock.aggregate([
        { $match: { operator_address: operator_address, [search_by]: condition }},
        {
          $setWindowFields: {
            partitionBy: "$operator_address",
            sortBy: { block_height: -1 },
            output: {
              mostRecent: { $first: "$$ROOT" },
              leastRecent: { $last: "$$ROOT" }
            }
          }
        },
        {
          $group: {
            _id: "$operator_address",
            mostRecentRecord: { $first: "$mostRecent" },
            leastRecentRecord: { $first: "$leastRecent" }
          }
        }
      ])
        .then((records) => {
          const mapping: Record<string, any> = {};
          
          records.forEach((record) => {
            
            const totalReward = (record.mostRecentRecord.reward_prefix_sum - record.leastRecentRecord.reward_prefix_sum || 0) + (record.leastRecentRecord.reward || 0);
            const totalSelfStake = (record.mostRecentRecord.self_stake_prefix_sum - record.leastRecentRecord.self_stake_prefix_sum || 0) + (record.leastRecentRecord.self_stake || 0);
            const totalCommission = (record.mostRecentRecord.commission_prefix_sum - record.leastRecentRecord.commission_prefix_sum || 0) + (record.leastRecentRecord.commission || 0);
            const totalStake = (record.mostRecentRecord.total_stake_prefix_sum - record.leastRecentRecord.total_stake_prefix_sum || 0) + (record.leastRecentRecord.total_stake || 0);
            const totalWithdraw = (record.mostRecentRecord.total_withdraw_prefix_sum - record.leastRecentRecord.total_withdraw_prefix_sum || 0) + (record.leastRecentRecord.total_withdraw || 0);
            
            const daysBetweenTimestamps = Math.ceil(((top_timestamp || 1) - (bottom_timestamp || 1)) / (86400 * 1000));
            mapping[record._id] = {
              self_stake: totalSelfStake || 0,
              reward: totalReward || 0,
              commission: totalCommission || 0,
              average_total_stake: (totalStake || 0) / daysBetweenTimestamps,
              average_withdraw: (totalWithdraw || 0) / daysBetweenTimestamps
            };
          });
      
          return callback(null, mapping);
        })
        .catch((err) => callback(err, null));
}


compositeEventBlockSchema.statics.getPeriodicDataForValidatorSet = function (
  body: Parameters<CompositeEventBlockModel['getPeriodicDataForValidatorSet']>[0],
  callback: Parameters<CompositeEventBlockModel['getPeriodicDataForValidatorSet']>[1]
) {

  const { chain_identifier, bottom_timestamp, top_timestamp, search_by } = body;

  if (search_by != 'block_height' && search_by != 'timestamp') return callback('bad_request', null);

  const oneMonthStepTimestamp = (1000 * 86400) * 30;
  const promises = [];
  const validatorRecordsMapping: Record<string, any> = {}

  let bottom = bottom_timestamp;
  let top = top_timestamp;

  while (bottom < top) {

    const bottomBottomInside = bottom;
    const bottomTopInside = bottom + oneMonthStepTimestamp;

    const topBottomInside = top - oneMonthStepTimestamp;
    const topTopInside = top;

    promises.push(
      new Promise((resolve, reject) => {

        CompositeEventBlock.aggregate([
          { 
            $match: { 
              chain_identifier: chain_identifier, 
              $or: [
                {
                  timestamp: { $gte: bottomBottomInside, $lte: bottomTopInside }
                },
                {
                  timestamp: { $gte: topBottomInside, $lte: topTopInside }
                }
              ]
            } 
          },
          {
            $sort: {
              chain_identifier: 1,
              timestamp: 1,
              operator_address: 1,
              block_height: -1
            }
          },
          {
            $group: {
              _id: "$operator_address",  
              mostRecentRecord: { $last: "$$ROOT" },
              leastRecentRecord: { $first: "$$ROOT" }
            }
          }
        ])
          .then((records) => {
            
            records.forEach(record => {

              if (!validatorRecordsMapping[record._id]) {
                return validatorRecordsMapping[record._id] = {
                  leastRecentRecord: record.leastRecentRecord,
                  mostRecentRecord: record.mostRecentRecord
                };
              }

              if (record.leastRecentRecord.block_height < validatorRecordsMapping[record._id].leastRecentRecord.block_height)
                return validatorRecordsMapping[record._id].leastRecentRecord = record.leastRecentRecord;
              
              if (record.mostRecentRecord.block_height > validatorRecordsMapping[record._id].mostRecentRecord.block_height)
                return validatorRecordsMapping[record._id].mostRecentRecord = record.mostRecentRecord;
            });

            resolve(true);
          })
          .catch(err => reject(err))
      })
    );

    bottom = bottomTopInside;
    top = topBottomInside;
  }

  Promise.allSettled(promises)
    .then((results: any) => {
      
      const mapping: Record<string, any> = {};
      Object.entries(validatorRecordsMapping).forEach(([validatorId, record]: [string, any]) => {

        const totalReward = (record.mostRecentRecord.reward_prefix_sum - record.leastRecentRecord.reward_prefix_sum || 0) + (record.leastRecentRecord.reward || 0);
        const totalSelfStake = (record.mostRecentRecord.self_stake_prefix_sum - record.leastRecentRecord.self_stake_prefix_sum || 0) + (record.leastRecentRecord.self_stake || 0);
        const totalCommission = (record.mostRecentRecord.commission_prefix_sum - record.leastRecentRecord.commission_prefix_sum || 0) + (record.leastRecentRecord.commission || 0);
        const totalStake = (record.mostRecentRecord.total_stake_prefix_sum - record.leastRecentRecord.total_stake_prefix_sum || 0) + (record.leastRecentRecord.total_stake || 0);
        const totalWithdraw = (record.mostRecentRecord.total_withdraw_prefix_sum - record.leastRecentRecord.total_withdraw_prefix_sum || 0) + (record.leastRecentRecord.total_withdraw || 0);
      
        const daysBetweenTimestamps = Math.ceil(((top_timestamp || 1) - (bottom_timestamp || 1)) / (86400 * 1000));
      
        mapping[validatorId] = {
          self_stake: totalSelfStake || 0,
          reward: totalReward || 0,
          commission: totalCommission || 0,
          average_total_stake: (totalStake || 0) / daysBetweenTimestamps,
          average_withdraw: (totalWithdraw || 0) / daysBetweenTimestamps
        };
      });

      return callback(null, mapping);
  })

}

compositeEventBlockSchema.statics.checkIfBlockExistsAndUpdate = function (
  body: Parameters<CompositeEventBlockModel['checkIfBlockExistsAndUpdate']>[0],
  callback: Parameters<CompositeEventBlockModel['checkIfBlockExistsAndUpdate']>[1],
) {

  const { operator_address, block_height, update_body } = body;

  if (!update_body.self_stake) delete update_body.self_stake;
  if (!update_body.reward) delete update_body.reward;  
  if (!update_body.commission) delete update_body.commission;
  if (!update_body.total_stake) delete update_body.total_stake;
  if (!update_body.total_withdraw) delete update_body.total_withdraw;

  if (!update_body.self_stake_prefix_sum) delete update_body.self_stake_prefix_sum;
  if (!update_body.reward_prefix_sum) delete update_body.reward_prefix_sum;
  if (!update_body.commission_prefix_sum) delete update_body.commission_prefix_sum;
  if (!update_body.total_stake_prefix_sum) delete update_body.total_stake_prefix_sum;
  if (!update_body.total_withdraw_prefix_sum) delete update_body.total_withdraw_prefix_sum;

  CompositeEventBlock
    .findOneAndUpdate(
      { operator_address: operator_address, block_height: block_height }, 
      update_body,
    )
    .then((updatedCompositeEventBlock: CompositeEventBlockInterface | null) => {
      return callback(null, updatedCompositeEventBlock);
    })
    .catch(err => callback(err, null))
}

compositeEventBlockSchema.statics.saveCompositeEventBlock = function (
  body: Parameters<CompositeEventBlockModel['saveCompositeEventBlock']>[0],
  callback: Parameters<CompositeEventBlockModel['saveCompositeEventBlock']>[1]
) {

  const { block_height, operator_address, denom, self_stake, reward, commission, total_stake, total_withdraw, timestamp } = body;

  CompositeEventBlock.searchTillExists(
    {
      operator_address: operator_address,
      block_height: block_height,
      search_by: 'block_height',
      order: 'desc'
    }, 
    (err, foundCompositeBlockEvent) => {
      if (err) return callback(err, null); 

      const self_stake_prefix_sum = foundCompositeBlockEvent ? (self_stake ? foundCompositeBlockEvent.self_stake_prefix_sum + self_stake : foundCompositeBlockEvent.self_stake_prefix_sum) : self_stake;
      const reward_prefix_sum = foundCompositeBlockEvent ? (reward ? foundCompositeBlockEvent.reward_prefix_sum + reward : foundCompositeBlockEvent.reward_prefix_sum) : reward;
      const commission_prefix_sum = foundCompositeBlockEvent ? (commission ? foundCompositeBlockEvent.commission_prefix_sum + commission : foundCompositeBlockEvent.commission_prefix_sum) : commission;
      const total_stake_prefix_sum = foundCompositeBlockEvent ? (total_stake ? foundCompositeBlockEvent.total_stake_prefix_sum + total_stake : foundCompositeBlockEvent.total_stake_prefix_sum) : total_stake;
      const total_withdraw_prefix_sum = foundCompositeBlockEvent ? (total_withdraw ? foundCompositeBlockEvent.total_withdraw_prefix_sum + total_withdraw : foundCompositeBlockEvent.total_withdraw_prefix_sum) : total_withdraw;

      CompositeEventBlock.checkIfBlockExistsAndUpdate({
        operator_address: operator_address,
        block_height: block_height,
        update_body: {
          self_stake: self_stake ? self_stake : 0,
          reward: reward ? reward : 0,
          commission: commission ? commission : 0,
          total_stake: total_stake ? total_stake : 0,
          total_withdraw: total_withdraw ? total_withdraw : 0,
          self_stake_prefix_sum: self_stake_prefix_sum ? self_stake_prefix_sum : 0,
          reward_prefix_sum: reward_prefix_sum ? reward_prefix_sum : 0,
          commission_prefix_sum: commission_prefix_sum ? commission_prefix_sum : 0,
          total_stake_prefix_sum: total_stake_prefix_sum ? total_stake_prefix_sum : 0,
          total_withdraw_prefix_sum: total_withdraw_prefix_sum ? total_withdraw_prefix_sum : 0
        }
      }, (err, updatedCompositeEventBlock) => {

        if (err) return callback(err, null);
        if (updatedCompositeEventBlock) return callback(null, updatedCompositeEventBlock);

        CompositeEventBlock
          .create({
            operator_address: operator_address,
            block_height: block_height,
            timestamp: timestamp,
            denom: denom,
            self_stake: self_stake ? self_stake : 0,
            reward: reward ? reward : 0,
            commission: commission ? commission : 0,
            total_stake: total_stake ? total_stake : 0,
            total_withdraw: total_withdraw ? total_withdraw : 0,
            self_stake_prefix_sum: self_stake_prefix_sum ? self_stake_prefix_sum : 0,
            reward_prefix_sum: reward_prefix_sum ? reward_prefix_sum : 0,
            commission_prefix_sum: commission_prefix_sum ? commission_prefix_sum : 0,
            total_stake_prefix_sum: total_stake_prefix_sum ? total_stake_prefix_sum : 0,
            total_withdraw_prefix_sum: total_withdraw_prefix_sum ? total_withdraw_prefix_sum : 0
          })
          .then((newCompositeEventBlock: CompositeEventBlockInterface) => { 
            return callback(null, newCompositeEventBlock);
          })
          .catch(err => callback('bad_request', null))
      })
    }
  )
}

compositeEventBlockSchema.statics.saveManyCompositeEventBlocks = function (
  body: Parameters<CompositeEventBlockModel['saveManyCompositeEventBlocks']>[0],
  callback: Parameters<CompositeEventBlockModel['saveManyCompositeEventBlocks']>[1],
) {
  const compositeEventBlocksArray = Object.values(body);

  const operatorAddresses = compositeEventBlocksArray.map(each => each.operator_address);

  CompositeEventBlock.aggregate([
    { $match: { operator_address: { $in: operatorAddresses } } },
    { $sort: { block_height: -1 } },
    {
      $group: {
        _id: "$operator_address",
        mostRecentRecord: { $first: "$$ROOT" }, 
      },
    },
    { $replaceRoot: { newRoot: "$mostRecentRecord" } } 
  ], { allowDiskUse: true })
  .then((mostRecendRecordsArray) => {
    if (mostRecendRecordsArray.length <= 0) mostRecendRecordsArray = compositeEventBlocksArray;
    
    const compositeEventBlocksArrayToInsertMany: {
      chain_identifier: string;
      timestamp: number;
      block_height: number;
      operator_address: string;
      denom: string;
      self_stake: number,
      reward: number,
      commission: number,
      total_stake: number,
      total_withdraw: number,
      self_stake_prefix_sum: number,
      reward_prefix_sum: number,
      commission_prefix_sum: number,
      total_stake_prefix_sum: number,
      total_withdraw_prefix_sum: number,
    }[] = [];
    
    for (let i = 0; i < mostRecendRecordsArray.length; i++) {
      const mostRecentCompositeEventBlock = mostRecendRecordsArray[i];
      
      const selfStake = body[mostRecentCompositeEventBlock.operator_address].self_stake;
      const reward = body[mostRecentCompositeEventBlock.operator_address].reward;
      const commission = body[mostRecentCompositeEventBlock.operator_address].commission;
      const totalStake = body[mostRecentCompositeEventBlock.operator_address].total_stake;
      const totalWithdraw = body[mostRecentCompositeEventBlock.operator_address].total_withdraw;

      const selfStakePrefixSum = mostRecentCompositeEventBlock.self_stake_prefix_sum ? (selfStake ? mostRecentCompositeEventBlock.self_stake_prefix_sum + selfStake : mostRecentCompositeEventBlock.self_stake_prefix_sum) : selfStake;
      const rewardPrefixSum = mostRecentCompositeEventBlock.reward_prefix_sum ? (reward ? mostRecentCompositeEventBlock.reward_prefix_sum + reward : mostRecentCompositeEventBlock.reward_prefix_sum) : reward;
      const commissionPrefixSum = mostRecentCompositeEventBlock.commission_prefix_sum ? (commission ? mostRecentCompositeEventBlock.commission_prefix_sum + commission : mostRecentCompositeEventBlock.commission_prefix_sum) : commission;
      const totalStakePrefixSum = mostRecentCompositeEventBlock.total_stake_prefix_sum ? (totalStake ? mostRecentCompositeEventBlock.total_stake_prefix_sum + totalStake : mostRecentCompositeEventBlock.total_stake_prefix_sum) : totalStake;
      const totalWithdrawPrefixSum = mostRecentCompositeEventBlock.total_withdraw_prefix_sum ? (totalWithdraw ? mostRecentCompositeEventBlock.total_withdraw_prefix_sum + totalWithdraw : mostRecentCompositeEventBlock.total_withdraw_prefix_sum) : totalWithdraw;

      if (!body[mostRecentCompositeEventBlock.operator_address].denom) continue;

      const saveObject = {
        chain_identifier: body[mostRecentCompositeEventBlock.operator_address].chain_identifier,
        timestamp: body[mostRecentCompositeEventBlock.operator_address].timestamp,
        block_height: body[mostRecentCompositeEventBlock.operator_address].block_height,
        operator_address: mostRecentCompositeEventBlock.operator_address,
        denom: body[mostRecentCompositeEventBlock.operator_address].denom,
        self_stake: selfStake ?? 0,
        reward: reward ?? 0,
        commission: commission ?? 0,
        total_stake: totalStake ?? 0,
        total_withdraw: totalWithdraw ?? 0,
        reward_prefix_sum: rewardPrefixSum,
        self_stake_prefix_sum: selfStakePrefixSum,
        commission_prefix_sum: commissionPrefixSum,
        total_stake_prefix_sum: totalStakePrefixSum,
        total_withdraw_prefix_sum: totalWithdrawPrefixSum
      }

      compositeEventBlocksArrayToInsertMany.push(saveObject);
    }

    const blockHeightsArray = compositeEventBlocksArrayToInsertMany.map(each => each.block_height);

    CompositeEventBlock.find({ block_height: { $in: blockHeightsArray } })
      .then((alreadyExistingCompositeEventBlocks) => {

        const existingBlockHeights = alreadyExistingCompositeEventBlocks.map(each => each.block_height);

        const newCompositeEventBlocks = compositeEventBlocksArrayToInsertMany.filter(each => !existingBlockHeights.includes(each.block_height));
        const updateCompositeEventBlocks = compositeEventBlocksArrayToInsertMany.filter(each => existingBlockHeights.includes(each.block_height));

        CompositeEventBlock
          .insertMany(newCompositeEventBlocks, { ordered: false })
          .then(insertedCompositeEventBlocks => {

            const updateCompositeEventBlocksBulk = updateCompositeEventBlocks.map(each => {

              const updateObj: { [key: string]: any } = {};
             
              if (each.self_stake != 0) updateObj.self_stake = each.self_stake;
              if (each.reward != 0) updateObj.reward = each.reward;
              if (each.commission != 0) updateObj.commission = each.commission;
              if (each.total_stake != 0) updateObj.total_stake = each.total_stake;
              if (each.total_withdraw != 0) updateObj.total_withdraw = each.total_withdraw;

              if (each.reward_prefix_sum != 0) updateObj.reward_prefix_sum = each.reward_prefix_sum;
              if (each.self_stake_prefix_sum != 0) updateObj.self_stake_prefix_sum = each.self_stake_prefix_sum;
              if (each.commission_prefix_sum != 0) updateObj.commission_prefix_sum = each.commission_prefix_sum;
              if (each.total_stake_prefix_sum != 0) updateObj.total_stake_prefix_sum = each.total_stake_prefix_sum;
              if (each.total_withdraw_prefix_sum != 0) updateObj.total_withdraw_prefix_sum = each.total_withdraw_prefix_sum;

              return {
                updateOne: {
                  filter: { block_height: each.block_height },
                  update: { $set: updateObj }
                }
              };
            });
        
            CompositeEventBlock
              .bulkWrite(updateCompositeEventBlocksBulk)
              .then(updateCompositeEventBlocks => callback(null, insertedCompositeEventBlocks))
              .catch(err => callback(err, null))
          })
          .catch(err => callback(err, null))
      })
  })
  .catch((err) => callback(err, null));
}

compositeEventBlockSchema.statics.getTotalPeriodicSelfStakeAndWithdraw = function (
  body: Parameters<CompositeEventBlockModel['getTotalPeriodicSelfStakeAndWithdraw']>[0],
  callback: Parameters<CompositeEventBlockModel['getTotalPeriodicSelfStakeAndWithdraw']>[1]
) {
  const { operator_address, bottomBlockHeight, topBlockHeight, bottomTimestamp, topTimestamp, searchBy } = body;

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);
  if (!bottomTimestamp || !topTimestamp) return callback('format_error', null);

  Promise.all([
    new Promise((resolve) => {
      CompositeEventBlock.searchTillExists({
        operator_address: operator_address,
        block_height: bottomBlockHeight ? bottomBlockHeight : -1,
        timestamp: bottomTimestamp ? bottomTimestamp : -1,
        search_by: searchBy,
        order: 1
      },
      (err, bottomCompositeBlockEvent) => {
        resolve({ err, bottomCompositeBlockEvent })
      })
    }),
    new Promise((resolve) => {

      CompositeEventBlock.searchTillExists({
        operator_address: operator_address,
        block_height: topBlockHeight ? topBlockHeight : -1,
        timestamp: topTimestamp ? topTimestamp : -1,
        search_by: searchBy,
        order: -1
      },
      (err, topCompositeBlockEvent) => {
        resolve({ err, topCompositeBlockEvent })
      })
    })
  ])
    .then(([bottomResult, topResult]: any) => {

      const { err_bottom, bottomCompositeBlockEvent } = bottomResult;
      const { err_top, topCompositeBlockEvent } = topResult;

      if (err_bottom || err_top)
        return callback(null, { self_stake: 0, reward: 0, commission: 0, average_total_stake: 0, average_withdraw: 0 });   

      const bottomRewardPrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.reward_prefix_sum : 0;
      const bottomSelfStakePrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.self_stake_prefix_sum : 0;
      const bottomCommissionPrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.commission_prefix_sum : 0;
      const bottomTotalStakePrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.total_stake_prefix_sum : 0;
      const bottomTotalWithdrawPrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.total_withdraw_prefix_sum : 0;

      const bottomReward = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.reward : 0;
      const bottomSelfStake = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.self_stake : 0;
      const bottomCommission = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.commission : 0;
      const bottomTotalStake = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.total_stake : 0;
      const bottomTotalWithdraw = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.total_withdraw : 0;

      const topRewardPrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.reward_prefix_sum : 0;
      const topSelfStakePrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.self_stake_prefix_sum : 0;
      const topCommissionPrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.commission_prefix_sum : 0;
      const topTotalStakePrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.total_stake_prefix_sum : 0;
      const topTotalWithdrawPrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.total_withdraw_prefix_sum : 0;

      const totalReward = (topRewardPrefixSum - bottomRewardPrefixSum) + bottomReward;
      const totalSelfStake = (topSelfStakePrefixSum - bottomSelfStakePrefixSum) + bottomSelfStake;
      const totalCommission = (topCommissionPrefixSum - bottomCommissionPrefixSum) + bottomCommission;

      const daysBetweenTimestamps = Math.ceil(Math.abs(topTimestamp - bottomTimestamp) / 86400000);
      const averageTotalStake = ((topTotalStakePrefixSum - bottomTotalStakePrefixSum) + bottomTotalStake) / daysBetweenTimestamps;
      const averageTotalWithdraw = ((topTotalWithdrawPrefixSum - bottomTotalWithdrawPrefixSum) + bottomTotalWithdraw) / daysBetweenTimestamps;

      return callback(
        null,
        {
          self_stake: totalSelfStake,
          reward: totalReward,
          commission: totalCommission,
          average_total_stake: averageTotalStake,
          average_withdraw: averageTotalWithdraw
        }
      );
    }
  )
}


const CompositeEventBlock = mongoose.model<CompositeEventBlockInterface, CompositeEventBlockModel>('CompositeEventBlocks', compositeEventBlockSchema);

export default CompositeEventBlock;
