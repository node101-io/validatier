
import mongoose, { Schema, Model } from 'mongoose';
import { isOperatorAddressValid, isTxHashValid } from '../../utils/validationFunctions.js';

const MAX_DENOM_LENGTH = 68;

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
    required: true,
    trim: true
  },
  denom: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: MAX_DENOM_LENGTH
  },
  amount: { 
    type: String, 
    required: true,
    trim: true
  },
  txHash: { 
    type: String,
    required: true,
    trim: true,
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

  if (!isOperatorAddressValid(operator_address) || !isTxHashValid(txHash)) return callback('format_error', null);

  StakeRecordEvent
    .create({ 
      operator_address: operator_address,
      denom: denom,
      amount: amount,
      txHash: txHash
    })
    .then((newStakeRecordEvent: StakeRecordEventInterface) => {
      if (!newStakeRecordEvent) return callback('creation_error', null);
      return callback(null, newStakeRecordEvent);
    })
    .catch(err => callback('creation_error', null))
}


const StakeRecordEvent = mongoose.model<StakeRecordEventInterface, StakeRecordEventModel>('StakeRecordEvents', stakeRecordEventSchema);

export default StakeRecordEvent;
