
import mongoose, { Schema, Model } from 'mongoose';

export interface ValidatorStatusInterface {
  operator_address: string,
  status: 'inactive' | 'jailed',
  bottom_timestamp: number,
  top_timestamp: number
}

interface ValidatorStatusModel extends Model<ValidatorStatusInterface> {
  saveValidatorStatus: (
    body: {
      operator_address: string,
      status: 'inactive' | 'jailed',
      action: 'start' | 'finish'
      timestamp: number
    }, 
    callback: (
      err: string | null,
      newValidatorStatus: ValidatorStatusInterface | null
    ) => any
  ) => any;
  getValidatorStatusHistory: (
    body: { operator_address: string },
    callback: (
      err: string | null,
      validatorStatusHistory: ValidatorStatusInterface[] | null
    ) => any
  ) => any;
}


const validatorStatusSchema = new Schema<ValidatorStatusInterface>({
  operator_address: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    trim: true
  },
  bottom_timestamp: {
    type: Number,
    required: true
  },
  top_timestamp: {
    type: Number,
    required: false,
    default: null
  }
});


validatorStatusSchema.statics.saveValidatorStatus = function (
  body: Parameters<ValidatorStatusModel['saveValidatorStatus']>[0],
  callback: Parameters<ValidatorStatusModel['saveValidatorStatus']>[1]
) {

  const { operator_address, status, action, timestamp } = body;

  ValidatorStatus
    .findOne({ operator_address: operator_address, status: status, top_timestamp: null })
    .then(validatorStatus => {

      if (!validatorStatus) {
        if (action != 'start') return callback(null, null)
        return ValidatorStatus.create({
          operator_address: operator_address,
          bottom_timestamp: timestamp,
          status: status,
        }).then(newValidatorStatus => callback(null, newValidatorStatus));
      }

      if (action != 'finish') return callback(null, null);

      validatorStatus.top_timestamp = timestamp;
      validatorStatus.save();

      return callback(null, validatorStatus);

    }).catch(err => callback(err, null))
}

validatorStatusSchema.statics.getValidatorStatusHistory = function (
  body: Parameters<ValidatorStatusModel['getValidatorStatusHistory']>[0],
  callback: Parameters<ValidatorStatusModel['getValidatorStatusHistory']>[1]
) {
  const { operator_address } = body;
  ValidatorStatus
    .find({ operator_address: operator_address })
    .then(validatorStatusHistory => callback(null, validatorStatusHistory))
    .catch(err => callback(err, null));
}


const ValidatorStatus = mongoose.model<ValidatorStatusInterface, ValidatorStatusModel>('ValidatorStatuss', validatorStatusSchema);

export default ValidatorStatus;
