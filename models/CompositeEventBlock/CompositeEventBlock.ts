
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
    body: { block_height: number; step: number },
    callback: (
      err: string,
      existingBlockHeight: number
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
  body: { block_height: number, step: number },
  callback: (
    err: string | null,
    foundCompositeBlock: number | null
  ) => any
) {

  const { block_height, step } = body;

  function search(blockHeight: number) {

    if (blockHeight < 0) return callback(null, 0);

    CompositeEventBlock.exists({ block_height: blockHeight }, (err, exists) => {
      if (err) return callback("bad_request", null);
      if (!exists) return search(blockHeight + step);
      return callback(null, blockHeight);
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

  CompositeEventBlock.searchTillExists({ block_height: block_height, step: -1 }, (err, existingBlockHeight) => {
    if (err) return callback(err, null);


    CompositeEventBlock.findOne({ block_height: existingBlockHeight }, (err: string | null, previousCompositeEventBlock: CompositeEventBlockInterface) => {
      if (err) return callback(err, null);
      
      const reward_prefix_sum = previousCompositeEventBlock ? previousCompositeEventBlock.reward_prefix_sum + reward : reward;
      const self_stake_prefix_sum = previousCompositeEventBlock ? previousCompositeEventBlock.self_stake_prefix_sum + self_stake : self_stake;

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
    })
  })  
}


const CompositeEventBlock = mongoose.model<CompositeEventBlockInterface, CompositeEventBlockModel>('CompositeEventBlocks', compositeEventBlockSchema);

export default CompositeEventBlock;
