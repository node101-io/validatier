
import mongoose, { Schema, Model } from 'mongoose';

export interface StakeRecordEventInterface {
  timestamp: Date;
  operator_address: string;
  denom: string;
  amount: string;
  txHash: string;
}

interface StakeRecordEventModel extends Model<StakeRecordEventInterface> {
  saveStakeRecordEvent: (
    body: {
      operator_address: string;
      denom: string;
      amount: string;
      txHash: string;
    }, 
    callback: (
      err: string,
      newStakeRecordEvent: StakeRecordEventInterface
    ) => any
  ) => any;
}


const stakeRecordEventSchema = new Schema<StakeRecordEventInterface>({
  timestamp: { 
    type: Date, 
    default: new Date() 
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
  amount: { 
    type: String, 
    required: true,
    trim: true
  },
  txHash: { 
    type: String, 
    required: true,
    unique: true
  }
});


stakeRecordEventSchema.statics.saveStakeRecordEvent = function (
  body: {  
    operator_address: string;
    denom: string;
    amount: string;
    txHash: string;
  },
  callback: (
    err: string | null,
    newStakeRecordEvent: StakeRecordEventInterface | null
  ) => any
) {

  const { operator_address, denom, amount, txHash } = body;

  StakeRecordEvent.create({ 
    operator_address: operator_address,
    denom: denom,
    amount: amount,
    txHash: txHash
  }, (err, newStakeRecordEvent: StakeRecordEventInterface) => {
    if (err || !newStakeRecordEvent) return callback('creation_error', null);
    return callback(null, newStakeRecordEvent);
  })
}


const StakeRecordEvent = mongoose.model<StakeRecordEventInterface, StakeRecordEventModel>('StakeRecordEvents', stakeRecordEventSchema);

export default StakeRecordEvent;
