
import mongoose, { Schema, Model, SortOrder } from 'mongoose';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

const MAX_DENOM_LENGTH = 68;

export interface CompositeEventBlockInterface {
  timestamp: number;
  block_height: number;
  operator_address: string;
  denom: string;
  reward: number,
  self_stake: number,
  reward_prefix_sum: number,
  self_stake_prefix_sum: number
}

interface CompositeEventBlockModel extends Model<CompositeEventBlockInterface> {
  checkIfBlockExistsAndUpdate: (
    body: {
      operator_address: string;
      block_height: number;
      update_body: {
        reward?: number;
        self_stake?: number;
        reward_prefix_sum?: number;
        self_stake_prefix_sum?: number;
      }
    },
    callback: (
      err: string | null,
      updatedCompositeBlockEvent: CompositeEventBlockInterface | null
    ) => any
  ) => any;
  saveCompositeEventBlock: (
    body: {
      block_height: number;
      operator_address: string;
      denom?: string;
      reward?: number;
      self_stake?: number;
    }, 
    callback: (
      err: string | null,
      newCompositeEventBlock: CompositeEventBlockInterface | null
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
        withdraw: number
      } | null
    ) => any
  ) => any
}


const compositeEventBlockSchema = new Schema<CompositeEventBlockInterface>({
  timestamp: {
    type: Number,
    default: Date.now()
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
  reward: { 
    type: Number, 
    required: false,
    default: 0
  },
  self_stake: { 
    type: Number, 
    required: false,
    default: 0
  },
  reward_prefix_sum: {
    type: Number, 
    required: true,
  },
  self_stake_prefix_sum: {
    type: Number, 
    required: true
  }
});

compositeEventBlockSchema.statics.searchTillExists = function (
  body: Parameters<CompositeEventBlockModel['searchTillExists']>[0],
  callback: Parameters<CompositeEventBlockModel['searchTillExists']>[1]
) {

  const { operator_address, block_height, timestamp, search_by, order } = body;

  if ((order != 'asc' && order != 'desc') || (search_by != 'block_height' && search_by != 'timestamp')) return callback('bad_request', null);

  const condition = 
    order == 'asc' 
    ? (search_by == 'block_height' ? { $gt: block_height } : { $gt: timestamp }) 
    : (search_by == 'block_height' ? { $lt: block_height } : { $lt: timestamp });


  CompositeEventBlock
    .find({ 
      operator_address: operator_address,
      [search_by]: condition
    })
    .sort({ [search_by]: order })
    .exec()
    .then((compositeEventBlocksOfValidator: CompositeEventBlockInterface[]) => {
      if (!compositeEventBlocksOfValidator || compositeEventBlocksOfValidator.length <= 0) return callback(null, null);
      const foundCompositeBlockEvent = compositeEventBlocksOfValidator[0];
      return callback(null, foundCompositeBlockEvent);
    })
    .catch(err => callback('bad_request', null));
}

compositeEventBlockSchema.statics.checkIfBlockExistsAndUpdate = function (
  body: Parameters<CompositeEventBlockModel['checkIfBlockExistsAndUpdate']>[0],
  callback: Parameters<CompositeEventBlockModel['checkIfBlockExistsAndUpdate']>[1],
) {

  const { operator_address, block_height, update_body } = body;

  if (!update_body.reward) delete update_body.reward;
  if (!update_body.self_stake) delete update_body.self_stake;
  if (!update_body.reward_prefix_sum) delete update_body.reward_prefix_sum;
  if (!update_body.self_stake_prefix_sum) delete update_body.self_stake_prefix_sum;

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

  const { block_height, operator_address, denom, reward, self_stake } = body;

  CompositeEventBlock.searchTillExists(
    {
      operator_address: operator_address,
      block_height: block_height,
      search_by: 'block_height',
      order: 'desc'
    }, 
    (err, foundCompositeBlockEvent) => {
      if (err) return callback(err, null); 

      const reward_prefix_sum = foundCompositeBlockEvent ? (reward ? foundCompositeBlockEvent.reward_prefix_sum + reward : foundCompositeBlockEvent.reward_prefix_sum) : reward;
      const self_stake_prefix_sum = foundCompositeBlockEvent ? (self_stake ? foundCompositeBlockEvent.self_stake_prefix_sum + self_stake : foundCompositeBlockEvent.self_stake_prefix_sum) : self_stake;

      CompositeEventBlock.checkIfBlockExistsAndUpdate({
        operator_address: operator_address,
        block_height: block_height,
        update_body: {
          reward: reward ? reward : 0,
          self_stake: self_stake ? self_stake : 0,
          reward_prefix_sum: reward_prefix_sum ? reward_prefix_sum : 0,
          self_stake_prefix_sum: self_stake_prefix_sum ? self_stake_prefix_sum : 0,
        }
      }, (err, updatedCompositeEventBlock) => {

        if (err) return callback(err, null);
        if (updatedCompositeEventBlock) return callback(null, updatedCompositeEventBlock);

        CompositeEventBlock
          .create({
            operator_address: operator_address,
            block_height: block_height,
            denom: denom ? denom : 'uatom',
            reward: reward ? reward : 0,
            self_stake: self_stake ? self_stake : 0,
            reward_prefix_sum: reward_prefix_sum ? reward_prefix_sum : 0,
            self_stake_prefix_sum: self_stake_prefix_sum ? self_stake_prefix_sum : 0
          })
          .then((newCompositeEventBlock: CompositeEventBlockInterface) => { 
            return callback(null, newCompositeEventBlock);
          })
          .catch(err => callback('bad_request', null))
      })
    }
  )
}


compositeEventBlockSchema.statics.getTotalPeriodicSelfStakeAndWithdraw = function (
  body: Parameters<CompositeEventBlockModel['getTotalPeriodicSelfStakeAndWithdraw']>[0],
  callback: Parameters<CompositeEventBlockModel['getTotalPeriodicSelfStakeAndWithdraw']>[1]
) {
  const { operator_address, bottomBlockHeight, topBlockHeight, bottomTimestamp, topTimestamp, searchBy } = body;

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  CompositeEventBlock.searchTillExists(
    {
      operator_address: operator_address,
      block_height: bottomBlockHeight ? bottomBlockHeight : -1,
      timestamp: bottomTimestamp ? bottomTimestamp : -1,
      search_by: searchBy,
      order: 'asc'
    },
    (err, bottomCompositeBlockEvent) => {
      if (err) return callback('bad_request', null);

      if (
        ((searchBy == 'block_height' && topBlockHeight) && (!bottomCompositeBlockEvent || bottomCompositeBlockEvent.block_height > topBlockHeight)) ||
        ((searchBy == 'timestamp' && topTimestamp) && (!bottomCompositeBlockEvent || bottomCompositeBlockEvent.timestamp > topTimestamp))
      ) return callback(null, { self_stake: 0, withdraw: 0 });

      CompositeEventBlock.searchTillExists(
        {
          operator_address: operator_address,
          block_height: topBlockHeight ? topBlockHeight : -1,
          timestamp: topTimestamp ? topTimestamp : -1,
          search_by: searchBy,
          order: 'desc'
        },
        (err, topCompositeBlockEvent) => {
          if (err) return callback('bad_request', null);

          if (
            ((searchBy == 'block_height' && bottomBlockHeight) && (!bottomCompositeBlockEvent || bottomCompositeBlockEvent.block_height < bottomBlockHeight)) ||
            ((searchBy == 'timestamp' && bottomTimestamp) && (!bottomCompositeBlockEvent || bottomCompositeBlockEvent.timestamp < bottomTimestamp))
          ) return callback(null, { self_stake: 0, withdraw: 0 });

          const bottomRewardPrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.reward_prefix_sum : 0;
          const bottomSelfStakePrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.self_stake_prefix_sum : 0;
          
          const bottomReward = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.reward : 0;
          const bottomSelfStake = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.self_stake : 0;

          const topRewardPrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.reward_prefix_sum : 0;
          const topSelfStakePrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.self_stake_prefix_sum : 0;

          const totalWithdraw = (topRewardPrefixSum - bottomRewardPrefixSum) + bottomReward;
          const totalStake = (topSelfStakePrefixSum - bottomSelfStakePrefixSum) + bottomSelfStake;
          
          if (totalWithdraw < 0 || totalStake < 0) return callback('bad_request', null);
          return callback(
            null,
            {
              self_stake: totalStake,
              withdraw: totalWithdraw
            }
          );
        }
      )
    }
  )
}


const CompositeEventBlock = mongoose.model<CompositeEventBlockInterface, CompositeEventBlockModel>('CompositeEventBlocks', compositeEventBlockSchema);

export default CompositeEventBlock;
