
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RewardRecordEventInterface extends Document {
  timestamp: Date;
  operation_address: string;
  rewardsDenomArray: string[];
  rewardsAmountArray: string[];
  comissionsDenomArray: string[];
  comissionsAmountArray: string[];
}

interface RewardRecordEventModel extends Model<RewardRecordEventInterface> {
  saveRewardRecordEvent: (body: SaveRewardRecordEventInterface, callback: (err: string, newRewardRecordEvent: RewardRecordEventInterface) => any) => any;
}

interface SaveRewardRecordEventInterface {
  operation_address: string;
  rewardsDenomArray: string[];
  rewardsAmountArray: string[];
  comissionsDenomArray: string[];
  comissionsAmountArray: string[];
}


const RewardRecordEventSchema = new Schema<RewardRecordEventInterface>({
  timestamp: { type: Date, default: new Date() },
  operation_address: { type: String, required: true },
  rewardsDenomArray: { type: [String], required: true },
  rewardsAmountArray: { type: [String], required: true },
  comissionsDenomArray: { type: [String], required: true },
  comissionsAmountArray: { type: [String], required: true }
});


RewardRecordEventSchema.statics.saveRewardRecordEvent = function (body: SaveRewardRecordEventInterface, callback)
{

  const { operation_address, rewardsDenomArray, rewardsAmountArray, comissionsDenomArray, comissionsAmountArray } = body;

  RewardRecordEvent.create({ 
    operation_address: operation_address,
    rewardsDenomArray: rewardsDenomArray,
    rewardsAmountArray: rewardsAmountArray,
    comissionsDenomArray: comissionsDenomArray,
    comissionsAmountArray: comissionsAmountArray
  }, (err, newRewardRecordEvent) => {
    if (err || !newRewardRecordEvent) return callback('creation_error');
  })
}


const RewardRecordEvent = mongoose.model<RewardRecordEventInterface, RewardRecordEventModel>('RewardRecordEvents', RewardRecordEventSchema);

export default RewardRecordEvent;
