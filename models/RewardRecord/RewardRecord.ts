
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RewardRecordEventInterface extends Document {
  timestamp: Date;
  operator_address: string;
  rewardAmount: string;
  commissionAmount: string;
}

interface RewardRecordEventModel extends Model<RewardRecordEventInterface> {
  saveRewardRecordEvent: (body: SaveRewardRecordEventInterface, callback: (err: string, newRewardRecordEvent: RewardRecordEventInterface) => any) => any;
}

interface SaveRewardRecordEventInterface {
  operator_address: string;
  rewardAmount: string;
  commissionAmount: string;
}


const RewardRecordEventSchema = new Schema<RewardRecordEventInterface>({
  timestamp: { type: Date, default: new Date() },
  operator_address: { type: String, required: true },
  rewardAmount: { type: String, required: true },
  commissionAmount: { type: String, required: true }
});


RewardRecordEventSchema.statics.saveRewardRecordEvent = function (body: SaveRewardRecordEventInterface, callback)
{

  const { operator_address, rewardAmount, commissionAmount } = body;

  RewardRecordEvent.create({ 
    operator_address: operator_address,
    rewardAmount: rewardAmount,
    commissionAmount: commissionAmount
  }, (err, newRewardRecordEvent) => {
    if (err || !newRewardRecordEvent) return callback('creation_error');
  })
}


const RewardRecordEvent = mongoose.model<RewardRecordEventInterface, RewardRecordEventModel>('RewardRecordEvents', RewardRecordEventSchema);

export default RewardRecordEvent;
