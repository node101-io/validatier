
import mongoose, { Schema, Model } from 'mongoose';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

const MAX_DENOM_LENGTH = 68;

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
    required: true,
    trim: true
  },
  denomArray: { 
    type: [{
      type: String,
      trim: true,
      minlength: 1,
      maxlength: MAX_DENOM_LENGTH
    }],
    required: true 
  },
  balanceArray: { 
    type: [{
      type: String,
      trim: true
    }],
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

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  BalanceRecordEvent
    .create({ 
      operator_address: operator_address,
      denomArray: denomArray,
      balanceArray: balanceArray
    })
    .then((newBalanceRecordEvent: BalanceRecordEventInterface) => {
      if (!newBalanceRecordEvent) return callback('creation_error', null);
      return callback(null, newBalanceRecordEvent);
    })
    .catch(err => callback('creation_error', null))
}


const BalanceRecordEvent = mongoose.model<BalanceRecordEventInterface, BalanceRecordEventModel>('BalanceRecordEvents', balanceRecordEventSchema);

export default BalanceRecordEvent;
