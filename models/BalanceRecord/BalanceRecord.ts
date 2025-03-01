
import mongoose, { Schema, Model } from 'mongoose';

export interface BalanceRecordEventInterface {
  timestamp: Date;
  operator_address: string;
  denomArray: string[];
  balanceArray: string[];
}

interface BalanceRecordEventModel extends Model<BalanceRecordEventInterface> {
  saveBalanceRecordEvent: (
    body: {
      operator_address: string;
      denomArray: string[];
      balanceArray: string[];
    }, 
    callback: (
      err: string, 
      newBalanceRecordEvent: BalanceRecordEventInterface
    ) => any
  ) => any;
}

const balanceRecordEventSchema = new Schema<BalanceRecordEventInterface>({
  timestamp: { 
    type: Date,
    default: new Date()
  },
  operator_address: { 
    type: String, 
    required: true 
  },
  denomArray: { 
    type: [String], 
    required: true 
  },
  balanceArray: { 
    type: [String], 
    required: true 
  }
});


balanceRecordEventSchema.statics.saveBalanceRecordEvent = function (
  body: {
    operator_address: string;
    denomArray: string[];
    balanceArray: string[];
  }, 
  callback: (
    err: string | null,
    newBalanceRecordEvent: BalanceRecordEventInterface | null
  ) => any
) {

  const { operator_address, denomArray, balanceArray } = body;

  BalanceRecordEvent.create({ 
    operator_address: operator_address,
    denomArray: denomArray,
    balanceArray: balanceArray
  }, (err, newBalanceRecordEvent: BalanceRecordEventInterface) => {
    if (err || !newBalanceRecordEvent) return callback('creation_error', null);
    return callback(null, newBalanceRecordEvent);
  })
}


const BalanceRecordEvent = mongoose.model<BalanceRecordEventInterface, BalanceRecordEventModel>('BalanceRecordEvents', balanceRecordEventSchema);

export default BalanceRecordEvent;
