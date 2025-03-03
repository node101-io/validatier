
import mongoose, { Schema, Model, SortOrder } from 'mongoose';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

export interface CompositeEventBlockInterface {
  timestamp: Date;
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
      err: string,
      newCompositeEventBlock: CompositeEventBlockInterface
    ) => any
  ) => any;
  searchTillExists: (
    body: {
      operator_address: string;
      block_height: number; 
      order: SortOrder 
    },
    callback: (
      err: string,
      foundCompositeBlockEvent: CompositeEventBlockInterface
    ) => any
  ) => any;
  getTotalPeriodicSelfStakeAndWithdraw: (
    body: {
      operator_address: string;
      bottomBlockHeight: number;
      topBlockHeight: number;
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
    type: Date,
    default: new Date()
  },
  block_height: { 
    type: Number, 
    required: true
  },
  operator_address: { 
    type: String, 
    required: true 
  },
  denom: { 
    type: String, 
    required: true,
    trim: true
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
  body: { operator_address: string; block_height: number; order: SortOrder },
  callback: (
    err: string | null,
    foundCompositeBlock: CompositeEventBlockInterface | null
  ) => any
) {

  const { operator_address, block_height, order } = body;

  if (order != 'asc' && order != 'desc') return callback('bad_request', null);

  const blockHeightCondition = order === 'asc' ? { $gt: block_height } : { $lt: block_height };

  CompositeEventBlock.find({ 
    operator_address: operator_address,
    block_height: blockHeightCondition
  })
  .sort({ block_height: order })
  .exec()
  .then((compositeEventBlocksOfValidator: CompositeEventBlockInterface[]) => {
    if (!compositeEventBlocksOfValidator || compositeEventBlocksOfValidator.length <= 0) return callback(null, null);
    const foundCompositeBlockEvent = compositeEventBlocksOfValidator[0];
    return callback(null, foundCompositeBlockEvent);
  })
  .catch(err => callback('bad_request', null));
}

compositeEventBlockSchema.statics.checkIfBlockExistsAndUpdate = function (
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
) {

  const { operator_address, block_height, update_body } = body;

  if (!update_body.reward) delete update_body.reward;
  if (!update_body.self_stake) delete update_body.self_stake;
  if (!update_body.reward_prefix_sum) delete update_body.reward_prefix_sum;
  if (!update_body.self_stake_prefix_sum) delete update_body.self_stake_prefix_sum;

  CompositeEventBlock.findOneAndUpdate(
    { operator_address: operator_address, block_height: block_height }, 
    update_body,
    (err: string | null, updatedCompositeEventBlock: CompositeEventBlockInterface | null) => {
    if (err) return callback(err, null);
    return callback(null, updatedCompositeEventBlock);
  })
}

compositeEventBlockSchema.statics.saveCompositeEventBlock = function (
  body: {  
    block_height: number;
    operator_address: string;
    denom: string;
    reward?: number;
    self_stake?: number;
  },
  callback: (
    err: string | null,
    newCompositeEventBlock: CompositeEventBlockInterface | null
  ) => any
) {

  const { block_height, operator_address, denom, reward, self_stake } = body;

  CompositeEventBlock.searchTillExists(
    {
      operator_address: operator_address,
      block_height: block_height,
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

        CompositeEventBlock.create(
          {
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
  body: {
    operator_address: string;
    bottomBlockHeight: number;
    topBlockHeight: number;
  },
  callback: (
    err: string | null,
    totalPeriodicSelfStakeAndWithdraw: {
      self_stake: number,
      withdraw: number
    } | null
  ) => any
) {
  const { operator_address, bottomBlockHeight, topBlockHeight } = body;

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  CompositeEventBlock.searchTillExists(
    {
      operator_address: operator_address,
      block_height: bottomBlockHeight,
      order: 'asc'
    },
    (err, bottomCompositeBlockEvent) => {
      if (err) return callback('bad_request', null);

      if (!bottomCompositeBlockEvent || bottomCompositeBlockEvent.block_height > topBlockHeight) return callback(null, { self_stake: 0, withdraw: 0 });

      CompositeEventBlock.searchTillExists(
        {
          operator_address: operator_address,
          block_height: topBlockHeight,
          order: 'desc'
        },
        (err, topCompositeBlockEvent) => {
          if (err) return callback('bad_request', null);

          if (!topCompositeBlockEvent || topCompositeBlockEvent.block_height < bottomBlockHeight) return callback(null, { self_stake: 0, withdraw: 0 });

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
