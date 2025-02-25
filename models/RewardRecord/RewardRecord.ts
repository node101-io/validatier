
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RewardRecordEventInterface extends Document {
  timestamp: Date;
  operator_address: string;
  rewardsDenomArray: string[];
  rewardsAmountArray: string[];
  comissionsDenomArray: string[];
  comissionsAmountArray: string[];
}

interface RewardRecordEventModel extends Model<RewardRecordEventInterface> {
  saveRewardRecordEvent: (body: SaveRewardRecordEventInterface, callback: (err: string, newRewardRecordEvent: RewardRecordEventInterface) => any) => any;
}

interface SaveRewardRecordEventInterface {
  operator_address: string;
  rewardsDenomArray: string[];
  rewardsAmountArray: string[];
  comissionsDenomArray: string[];
  comissionsAmountArray: string[];
}


const RewardRecordEventSchema = new Schema<RewardRecordEventInterface>({
  timestamp: { type: Date, default: new Date() },
  operator_address: { type: String, required: true },
  rewardsDenomArray: { type: [String], required: true },
  rewardsAmountArray: { type: [String], required: true },
  comissionsDenomArray: { type: [String], required: true },
  comissionsAmountArray: { type: [String], required: true }
});


RewardRecordEventSchema.statics.saveRewardRecordEvent = function (body: SaveRewardRecordEventInterface, callback)
{

  const { operator_address, rewardsDenomArray, rewardsAmountArray, comissionsDenomArray, comissionsAmountArray } = body;

  RewardRecordEvent.create({ 
    operator_address: operator_address,
    rewardsDenomArray: rewardsDenomArray,
    rewardsAmountArray: rewardsAmountArray,
    comissionsDenomArray: comissionsDenomArray,
    comissionsAmountArray: comissionsAmountArray
  }, (err, newRewardRecordEvent) => {
    if (err || !newRewardRecordEvent) return callback('creation_error');
    return callback(null, newRewardRecordEvent);
  })
}


const RewardRecordEvent = mongoose.model<RewardRecordEventInterface, RewardRecordEventModel>('RewardRecordEvents', RewardRecordEventSchema);

export default RewardRecordEvent;
