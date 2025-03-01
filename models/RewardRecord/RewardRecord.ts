
import mongoose, { Schema, Model } from 'mongoose';

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
      err: string, 
      newRewardRecordEvent: RewardRecordEventInterface
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
    required: true 
  },
  rewardsDenomArray: { 
    type: [String], 
    required: true 
  },
  rewardsAmountArray: { 
    type: [String], 
    required: true 
  },
  comissionsDenomArray: { 
    type: [String], 
    required: true
  },
  comissionsAmountArray: { 
    type: [String], 
    required: true 
  }
});


RewardRecordEventSchema.statics.saveRewardRecordEvent = function (
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
) {

  const { operator_address, rewardsDenomArray, rewardsAmountArray, comissionsDenomArray, comissionsAmountArray } = body;

  RewardRecordEvent.create({ 
    operator_address: operator_address,
    rewardsDenomArray: rewardsDenomArray,
    rewardsAmountArray: rewardsAmountArray,
    comissionsDenomArray: comissionsDenomArray,
    comissionsAmountArray: comissionsAmountArray
  }, (err, newRewardRecordEvent: RewardRecordEventInterface) => {
    if (err) return callback('creation_error', null);
    return callback(null, newRewardRecordEvent);
  })
}


const RewardRecordEvent = mongoose.model<RewardRecordEventInterface, RewardRecordEventModel>('RewardRecordEvents', RewardRecordEventSchema);

export default RewardRecordEvent;
