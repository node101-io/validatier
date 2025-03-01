
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface StakeRecordEventInterface extends Document {
  timestamp: Date;
  operator_address: string;
  denom: string;
  amount: string;
  txHash: string;
}

interface StakeRecordEventModel extends Model<StakeRecordEventInterface> {
  saveStakeRecordEvent: (body: SaveStakeRecordEventInterface, callback: (err: string, newStakeRecordEvent: StakeRecordEventInterface) => any) => any;
}

interface SaveStakeRecordEventInterface {
  operator_address: string;
  denom: string;
  amount: string;
  txHash: string;
}


const stakeRecordEventSchema = new Schema<StakeRecordEventInterface>({
  timestamp: { type: Date, default: new Date() },
  operator_address: { type: String, required: true },
  denom: { type: String, required: true },
  amount: { type: String, required: true },
  txHash: { type: String, required: true }
});


stakeRecordEventSchema.statics.saveStakeRecordEvent = function (body: SaveStakeRecordEventInterface, callback)
{

  const { operator_address, denom, amount, txHash } = body;

  StakeRecordEvent.create({ 
    operator_address: operator_address,
    denom: denom,
    amount: amount,
    txHash: txHash
  }, (err, newStakeRecordEvent) => {
    if (err || !newStakeRecordEvent) return callback('creation_error');
    return callback(null, newStakeRecordEvent);
  })
}


const StakeRecordEvent = mongoose.model<StakeRecordEventInterface, StakeRecordEventModel>('StakeRecordEvents', stakeRecordEventSchema);

export default StakeRecordEvent;
