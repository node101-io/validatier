import mongoose, { Schema, Model } from 'mongoose';

export enum WithdrawType {
  Commission = "commission",
  Reward = "reward"
}

export interface WithdrawRecordEventInterface {
  timestamp: Date;
  operator_address: string;
  denom: string;
  amount: string;
  withdrawType: WithdrawType;
  txHash: string;
}

interface WithdrawRecordEventModel extends Model<WithdrawRecordEventInterface> {
  saveWithdrawRecordEvent: (
    body: {  
      operator_address: string;
      denom: string;
      amount: string;
      withdrawType: string;
      txHash: string;
    }, 
    callback: (
      err: string, 
      newWithdrawRecordEvent: WithdrawRecordEventInterface
    ) => any
  ) => any;
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
    },
    txHash: { type: String, required: true }
  }
);

withdrawRecordEventSchema.statics.saveWithdrawRecordEvent = function (
  body: {  
    operator_address: string;
    denom: string;
    amount: string;
    withdrawType: string;
    txHash: string;
  }, 
  callback: (
    err: string | null,
    newWithdrawRecordEvent: WithdrawRecordEventInterface | null
  ) => any
) {
  const { operator_address, denom, amount, withdrawType, txHash } = body;

  WithdrawRecordEvent.create({ 
    operator_address: operator_address,
    denom: denom,
    amount: amount,
    withdrawType: withdrawType,
    txHash: txHash
  }, (err, newWithdrawRecordEvent) => {
    if (err) return callback('creation_error', null);
    return callback(null, newWithdrawRecordEvent);
  });
}

const WithdrawRecordEvent = mongoose.model<WithdrawRecordEventInterface, WithdrawRecordEventModel>('WithdrawRecordEvents', withdrawRecordEventSchema);

export default WithdrawRecordEvent;
