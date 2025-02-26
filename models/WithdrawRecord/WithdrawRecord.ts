
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum WithdrawType {
  Commission = "commission",
  Reward = "reward"
}

export interface WithdrawRecordEventInterface extends Document {
  timestamp: Date;
  operator_address: string;
  denom: string;
  amount: string;
  withdrawType: WithdrawType;
}

interface WithdrawRecordEventModel extends Model<WithdrawRecordEventInterface> {
  saveWithdrawRecordEvent: (body: SaveWithdrawRecordEventInterface, callback: (err: string, newWithdrawRecordEvent: WithdrawRecordEventInterface) => any) => any;
}

interface SaveWithdrawRecordEventInterface {
  operator_address: string;
  denom: string;
  amount: string;
  withdrawType: string;
}


const withdrawRecordEventSchema: Schema = new Schema<WithdrawRecordEventInterface>(
  {
    timestamp: { type: Date, default: new Date() },
    operator_address: { type: String, required: true },
    denom: { type: String, required: true },
    amount: { type: String, required: true },
    withdrawType: {
      type: String,
      required: true,
      enum: [WithdrawType.Commission, WithdrawType.Reward],
    }
  }
);



withdrawRecordEventSchema.statics.saveWithdrawRecordEvent = function (body: SaveWithdrawRecordEventInterface, callback)
{

  const { operator_address, denom, amount, withdrawType } = body;

  WithdrawRecordEvent.create({ 
    operator_address: operator_address,
    denom: denom,
    amount: amount,
    withdrawType: withdrawType
  }, (err, newWithdrawRecordEvent) => {
    if (err || !newWithdrawRecordEvent) return callback('creation_error');
    return callback(null, newWithdrawRecordEvent);
  })
}


const WithdrawRecordEvent = mongoose.model<WithdrawRecordEventInterface, WithdrawRecordEventModel>('WithdrawRecordEvents', withdrawRecordEventSchema);

export default WithdrawRecordEvent;
