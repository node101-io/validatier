
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BalanceRecordEventInterface extends Document {
  timestamp: Date;
  operator_address: string;
  denomArray: string[];
  balanceArray: string[];
}

interface BalanceRecordEventModel extends Model<BalanceRecordEventInterface> {
  saveBalanceRecordEvent: (body: SaveBalanceRecordEventInterface, callback: (err: string, newBalanceRecordEvent: BalanceRecordEventInterface) => any) => any;
}

interface SaveBalanceRecordEventInterface {
  operator_address: string;
  denomArray: string[];
  balanceArray: string[];
}


const balanceRecordEventSchema = new Schema<BalanceRecordEventInterface>({
  timestamp: { type: Date, default: new Date() },
  operator_address: { type: String, required: true },
  denomArray: { type: [String], required: true },
  balanceArray: { type: [String], required: true }
});


balanceRecordEventSchema.statics.saveBalanceRecordEvent = function (body: SaveBalanceRecordEventInterface, callback)
{

  const { operator_address, denomArray, balanceArray } = body;

  BalanceRecordEvent.create({ 
    operator_address: operator_address,
    denomArray: denomArray,
    balanceArray: balanceArray
  }, (err, newBalanceRecordEvent) => {
    if (err || !newBalanceRecordEvent) return callback('creation_error');
    return callback(null, newBalanceRecordEvent);
  })
}


const BalanceRecordEvent = mongoose.model<BalanceRecordEventInterface, BalanceRecordEventModel>('BalanceRecordEvents', balanceRecordEventSchema);

export default BalanceRecordEvent;
