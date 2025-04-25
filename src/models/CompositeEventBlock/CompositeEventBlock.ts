
import mongoose, { Schema, Model } from 'mongoose';

export interface CompositeEventBlockInterface {
  chain_identifier: string;
  timestamp: number;
  day: number;
  month: number;
  year: number;
  operator_address: string;
  block_height: number;
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
  saveManyCompositeEventBlocks: (
    body: {
      chain_identifier: string;
      day: number;
      month: number;
      year: number;
      block_height: number;
      saveMapping: Record<string, {
        self_stake?: number;
        reward?: number;
        commission?: number;
        total_stake?: number;
        total_withdraw?: number;
      }> | null
    }, 
    callback: (
      err: string | null,
      savedCompositeEventBlocks: CompositeEventBlockInterface[] | null
    ) => any
  ) => any;
  getPeriodicDataForValidatorSet: (
    body: {
      chain_identifier: string;
      bottom_timestamp: number;
      top_timestamp: number;
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
      bottom_timestamp: number;
      top_timestamp: number;
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
  removeDuplicates: (
    body: { chain_identifier: string },
    callback: (
      err: string | null,
      delete_count: number
    ) => any
  ) => any;
}


const compositeEventBlockSchema = new Schema<CompositeEventBlockInterface>({
  chain_identifier: {
    type: String,
    trim: true
  },
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 31
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Number,
    required: true
  },
  operator_address: {
    type: String,
    required: true,
    trim: true
  },
  block_height: {
    type: Number,
    required: false,
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

compositeEventBlockSchema.index({ operator_address: 1, timestamp: 1 });
compositeEventBlockSchema.index({ chain_identifier: 1, timestamp: 1, operator_address: 1 });


compositeEventBlockSchema.statics.getPeriodicDataForGraphGeneration = function (
  body: Parameters<CompositeEventBlockModel['getPeriodicDataForGraphGeneration']>[0],
  callback: Parameters<CompositeEventBlockModel['getPeriodicDataForGraphGeneration']>[1]
) {

  const { operator_address, bottom_timestamp, top_timestamp } = body;

  CompositeEventBlock.aggregate([
    { $match: { operator_address: operator_address, timestamp: { $gte: bottom_timestamp, $lte: top_timestamp } }},
    {
      $setWindowFields: {
        partitionBy: "$operator_address",
        sortBy: { operator_address: 1, timestamp: 1 },
        output: {
          mostRecent: { $last: "$$ROOT" },
          leastRecent: { $first: "$$ROOT" }
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
  const { chain_identifier, bottom_timestamp, top_timestamp } = body;

  console.time('aggregate');
  CompositeEventBlock.aggregate([
    { 
      $match: { 
        chain_identifier: chain_identifier, 
        timestamp: { $gte: bottom_timestamp, $lte: top_timestamp }
      } 
    },
    {
      $sort: {
        chain_identifier: 1,
        timestamp: 1,
        operator_address: 1
      }
    },
    {
      $group: {
        _id: "$operator_address",
        leastRecentRecord: { $first: "$$ROOT" },
        mostRecentRecord: { $last: "$$ROOT" }
      }
    },
    {
      $project: {
        leastRecentRecord: {
          reward: 1,
          commission: 1,
          self_stake: 1,
          total_stake: 1,
          total_withdraw: 1,
          reward_prefix_sum: 1,
          commission_prefix_sum: 1,
          self_stake_prefix_sum: 1,
          total_stake_prefix_sum: 1,
          total_withdraw_prefix_sum: 1,
        },
        mostRecentRecord: {
          reward_prefix_sum: 1,
          commission_prefix_sum: 1,
          self_stake_prefix_sum: 1,
          total_stake_prefix_sum: 1,
          total_withdraw_prefix_sum: 1,
        }
      }
    }
  ])
    .then((records: any) => {
      
      console.timeEnd('aggregate');
      const mapping: Record<string, any> = {};
      records.forEach((record: any) => {

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
}

compositeEventBlockSchema.statics.saveManyCompositeEventBlocks = function (
  body: Parameters<CompositeEventBlockModel['saveManyCompositeEventBlocks']>[0],
  callback: Parameters<CompositeEventBlockModel['saveManyCompositeEventBlocks']>[1],
) {
  
  const { chain_identifier, day, month, year, block_height, saveMapping } = body;

  if (!saveMapping) return callback(null, []);

  const timestamp = (new Date(year, month, day)).getTime();

  const operatorAddresses = Object.keys(saveMapping);
  const compositeEventBlocksArray = Object.values(saveMapping);

  CompositeEventBlock.aggregate([
    { 
      $match: { 
        operator_address: { $in: operatorAddresses },
        timestamp: { $lte: timestamp }
      }
    },
    { $sort: { operator_address: 1, timestamp: 1 } },
    {
      $group: {
        _id: "$operator_address",
        mostRecentRecord: { $last: "$$ROOT" }, 
      },
    },
    { $replaceRoot: { newRoot: "$mostRecentRecord" } } 
  ])
  .then((mostRecendRecordsArray) => {
    const mostRecendRecordsMapping: Record<string, any> = {};
    for (const record of mostRecendRecordsArray) {
      mostRecendRecordsMapping[record.operator_address] = record;
    }
    
    const compositeEventBlocksArrayToInsertMany: CompositeEventBlockInterface[] = [];
    
    for (let i = 0; i < compositeEventBlocksArray.length; i++) {
      const operatorAddress = operatorAddresses[i];
      const newCompositeEventBlock = compositeEventBlocksArray[i];
      
      const mostRecentCompositeEventBlock = mostRecendRecordsMapping[operatorAddress]
        ? mostRecendRecordsMapping[operatorAddress]
        : newCompositeEventBlock;
      
      const selfStake = newCompositeEventBlock.self_stake || 0;
      const reward = newCompositeEventBlock.reward || 0;
      const commission = newCompositeEventBlock.commission || 0;
      const totalStake = newCompositeEventBlock.total_stake || 0;
      const totalWithdraw = newCompositeEventBlock.total_withdraw || 0;

      const selfStakePrefixSum = mostRecentCompositeEventBlock.self_stake_prefix_sum ? (selfStake ? mostRecentCompositeEventBlock.self_stake_prefix_sum + selfStake : mostRecentCompositeEventBlock.self_stake_prefix_sum) : selfStake;
      const rewardPrefixSum = mostRecentCompositeEventBlock.reward_prefix_sum ? (reward ? mostRecentCompositeEventBlock.reward_prefix_sum + reward : mostRecentCompositeEventBlock.reward_prefix_sum) : reward;
      const commissionPrefixSum = mostRecentCompositeEventBlock.commission_prefix_sum ? (commission ? mostRecentCompositeEventBlock.commission_prefix_sum + commission : mostRecentCompositeEventBlock.commission_prefix_sum) : commission;
      const totalStakePrefixSum = mostRecentCompositeEventBlock.total_stake_prefix_sum ? (totalStake ? mostRecentCompositeEventBlock.total_stake_prefix_sum + totalStake : mostRecentCompositeEventBlock.total_stake_prefix_sum) : totalStake;
      const totalWithdrawPrefixSum = mostRecentCompositeEventBlock.total_withdraw_prefix_sum ? (totalWithdraw ? mostRecentCompositeEventBlock.total_withdraw_prefix_sum + totalWithdraw : mostRecentCompositeEventBlock.total_withdraw_prefix_sum) : totalWithdraw;

      const saveObject = {
        chain_identifier: chain_identifier,
        day: day,
        month: month + 1,
        year: year,
        timestamp: timestamp,
        block_height: block_height,
        operator_address: operatorAddress,
        self_stake: selfStake || 0,
        reward: reward || 0,
        commission: commission || 0,
        total_stake: totalStake || 0,
        total_withdraw: totalWithdraw || 0,
        reward_prefix_sum: rewardPrefixSum,
        self_stake_prefix_sum: selfStakePrefixSum,
        commission_prefix_sum: commissionPrefixSum,
        total_stake_prefix_sum: totalStakePrefixSum,
        total_withdraw_prefix_sum: totalWithdrawPrefixSum
      }

      compositeEventBlocksArrayToInsertMany.push(saveObject);
    }

    const checkExistsOrQuery = compositeEventBlocksArrayToInsertMany.map(each => {
      return {
        timestamp: each.timestamp,
        operator_address: each.operator_address
      }
    });

    CompositeEventBlock.find({ $or: checkExistsOrQuery })
      .then((alreadyExistingCompositeEventBlocks) => {

        const existingCredentials = alreadyExistingCompositeEventBlocks.map(each => `${each.timestamp}.${each.operator_address}`);

        const newCompositeEventBlocks = compositeEventBlocksArrayToInsertMany.filter(each => 
          !existingCredentials.includes(`${each.timestamp}.${each.operator_address}`)
        );

        const updateCompositeEventBlocks = compositeEventBlocksArrayToInsertMany.filter(each => 
          existingCredentials.includes(`${each.timestamp}.${each.operator_address}`)  
        );

        CompositeEventBlock
          .insertMany(newCompositeEventBlocks, { ordered: false })
          .then(insertedCompositeEventBlocks => {

            const updateCompositeEventBlocksBulk = updateCompositeEventBlocks.map(each => {

              const updateObj: { [key: string]: any } = {};
             
              if (each.chain_identifier != undefined) updateObj.chain_identifier = each.chain_identifier;

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
                  filter: { timestamp: each.timestamp },
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

compositeEventBlockSchema.statics.removeDuplicates = function (
  body: Parameters<CompositeEventBlockModel['removeDuplicates']>[0],
  callback: Parameters<CompositeEventBlockModel['removeDuplicates']>[1]
) {

  const { chain_identifier } = body;

  CompositeEventBlock.aggregate([
    { $match: { chain_identifier: chain_identifier } },
    { $sort: { operator_address: 1, timestamp: 1 } },
    {
      $group: {
        _id: { operator_address: "$operator_address", timestamp: "$timestamp" },
        ids: { $push: "$_id" },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ])
    .then(duplicates => {
      
      const idsToDelete = duplicates.flatMap(doc => doc.ids.slice(1));

      if (idsToDelete.length == 0) {
        return callback(null, 0);
      }

      CompositeEventBlock.deleteMany({ _id: { $in: idsToDelete } })
        .then(result => callback(null, result.deletedCount))
        .catch(err => callback(err, 0));
    })
    .catch(err => callback(err, 0));
};


const CompositeEventBlock = mongoose.model<CompositeEventBlockInterface, CompositeEventBlockModel>('CompositeEventBlocks', compositeEventBlockSchema);

export default CompositeEventBlock;
