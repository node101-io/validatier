
import mongoose, { Schema, Model } from 'mongoose';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

const MAX_DENOM_LENGTH = 68

export interface RewardRecordEventInterface {
  timestamp: Date;
  operator_address: string;
  rewardsDenomArray: string[];
  rewardsAmountArray: string[];
  comissionsDenomArray: string[];
  comissionsAmountArray: string[];
}

interface RewardRecordEventModel extends Model<RewardRecordEventInterface> {
  saveRewardRecordEvent: (
    body: {  
      operator_address: string;
      rewardsDenomArray: string[];
      rewardsAmountArray: string[];
      comissionsDenomArray: string[];
      comissionsAmountArray: string[];
    }, 
    callback: (
      err: string | null,
      newRewardRecordEvent: RewardRecordEventInterface | null
    ) => any
  ) => any;
}


const RewardRecordEventSchema = new Schema<RewardRecordEventInterface>({
  timestamp: { 
    type: Date, 
    default: new Date() 
  },
  operator_address: { 
    type: String, 
    required: true,
    trim: true
  },
  rewardsDenomArray: { 
    type: [{
      type: String,
      trim: true,
      minlength: 1,
      maxlength: MAX_DENOM_LENGTH
    }],
    required: true 
  },
  rewardsAmountArray: { 
    type: [{
      type: String,
      trim: true
    }],
    required: true
  },
  comissionsDenomArray: {
    type: [{
      type: String,
      trim: true,
      minlength: 1,
      maxlength: MAX_DENOM_LENGTH
    }],
    required: true
  },
  comissionsAmountArray: {
    type: [{
      type: String,
      trim: true
    }],
    required: true
  }
});


RewardRecordEventSchema.statics.saveRewardRecordEvent = function (
  body: Parameters<RewardRecordEventModel['saveRewardRecordEvent']>[0], 
  callback: Parameters<RewardRecordEventModel['saveRewardRecordEvent']>[1]
) {

  const { operator_address, rewardsDenomArray, rewardsAmountArray, comissionsDenomArray, comissionsAmountArray } = body;

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  RewardRecordEvent
    .create({ 
      operator_address: operator_address,
      rewardsDenomArray: rewardsDenomArray,
      rewardsAmountArray: rewardsAmountArray,
      comissionsDenomArray: comissionsDenomArray,
      comissionsAmountArray: comissionsAmountArray
    })
    .then((newRewardRecordEvent: RewardRecordEventInterface) => {
      if (!newRewardRecordEvent) return callback('creation_error', null);
      return callback(null, newRewardRecordEvent);
    })
    .catch(err => callback('creation_error', null))
}


const RewardRecordEvent = mongoose.model<RewardRecordEventInterface, RewardRecordEventModel>('RewardRecordEvents', RewardRecordEventSchema);

export default RewardRecordEvent;
