
import mongoose, { Schema, Model } from 'mongoose';

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
  saveCompositeEventBlock: (
    body: {
      block_height: number;
      operator_address: string;
      denom: string;
      reward: number;
      self_stake: number;
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
      step: number 
    },
    callback: (
      err: string,
      foundCompositeBlockEvent: CompositeEventBlockInterface
    ) => any
  ) => any;
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
    required: true,
    trim: true
  },
  self_stake: { 
    type: Number, 
    required: true,
    unique: true
  },
  reward_prefix_sum: {
    type: Number, 
    required: true,
    unique: true
  },
  self_stake_prefix_sum: {
    type: Number, 
    required: true,
    unique: true
  }
});

compositeEventBlockSchema.statics.searchTillExists = function (
  body: { operator_address: string; block_height: number; step: number },
  callback: (
    err: string | null,
    foundCompositeBlock: CompositeEventBlockInterface | null
  ) => any
) {

  const { operator_address, block_height, step } = body;

  function search(blockHeight: number) {

    if (blockHeight < 0) return callback(null, null);

    CompositeEventBlock.exists({ block_height: blockHeight }, (err, exists) => {
      if (err) return callback("bad_request", null);
      if (!exists) return search(blockHeight + step);
      CompositeEventBlock.findOne({ operator_address: operator_address, block_height: blockHeight }, (err: string | null, foundCompositeBlockEvent: CompositeEventBlockInterface) => {
        if (err) return callback("bad_request", null);
        return callback(null, foundCompositeBlockEvent);
      })
    })
  }

  search(block_height);
}

compositeEventBlockSchema.statics.saveCompositeEventBlock = function (
  body: {  
    block_height: number;
    operator_address: string;
    denom: string;
    reward: number;
    self_stake: number;
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
      step: -1 
    }, 
    (err, foundCompositeBlockEvent) => {
      if (err) return callback(err, null);

      const reward_prefix_sum = foundCompositeBlockEvent ? foundCompositeBlockEvent.reward_prefix_sum + reward : reward;
      const self_stake_prefix_sum = foundCompositeBlockEvent ? foundCompositeBlockEvent.self_stake_prefix_sum + self_stake : self_stake;
      
      CompositeEventBlock.create(
        {
          operator_address: operator_address,
          block_height: block_height,
          denom: denom,
          reward: reward,
          self_stake: self_stake,
          reward_prefix_sum: reward_prefix_sum,
          self_stake_prefix_sum: self_stake_prefix_sum
        }, 
        (err, newCompositeEventBlock) => {
          if (err) return callback("bad_request", null);
          return callback(null, newCompositeEventBlock);
        }
      )
      
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

  CompositeEventBlock.searchTillExists(
    {
      operator_address: operator_address,
      block_height: bottomBlockHeight,
      step: 1
    },
    (err, bottomCompositeBlockEvent) => {
      if (err) return callback("bad_request", null);

      CompositeEventBlock.searchTillExists(
        {
          operator_address: operator_address,
          block_height: topBlockHeight,
          step: -1
        },
        (err, topCompositeBlockEvent) => {
          if (err) return callback("bad_request", null);

          const bottomRewardPrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.reward_prefix_sum : 0;
          const bottomSelfStakePrefixSum = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.self_stake_prefix_sum : 0;
          
          const bottomReward = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.reward : 0;
          const bottomSelfStake = bottomCompositeBlockEvent ? bottomCompositeBlockEvent.self_stake : 0;

          const topRewardPrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.reward_prefix_sum : 0;
          const topSelfStakePrefixSum = topCompositeBlockEvent ? topCompositeBlockEvent.self_stake_prefix_sum : 0;
          
          const totalWithdraw = (topRewardPrefixSum - bottomRewardPrefixSum) + bottomReward;
          const totalStake = (topSelfStakePrefixSum - bottomSelfStakePrefixSum) + bottomSelfStake;
          
          if (totalWithdraw < 0 || totalStake < 0) return callback("bad_request", null);
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
