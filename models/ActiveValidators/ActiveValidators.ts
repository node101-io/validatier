
import mongoose, { Schema, Model } from 'mongoose';

export interface ActiveValidatorsInterface {
  chain_identifier: string;
  month: number;
  year: number;
  active_validators: string[][];
}

interface ActiveValidatorsModel extends Model<ActiveValidatorsInterface> {
  saveActiveValidators: (
    body: {
      chain_identifier: string;
      month: number,
      year: number,
      active_validators_pubkeys_array: string[]
    },
    callback: (
      err: string | null,
      savedActiveValidators: ActiveValidatorsInterface | null
    ) => any
  ) => any
}

const activeValidatorsSchema = new Schema<ActiveValidatorsInterface>({
  chain_identifier: {
    type: String,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  year: {
    type: Number,
    required: true
  },
  active_validators: [
    {
      type: [String]
    }
  ]
});

activeValidatorsSchema.index({ chain_identifier: 1, month: 1, year: 1 }, { unique: true });

activeValidatorsSchema.statics.saveActiveValidators = function (
  body: Parameters<ActiveValidatorsModel['saveActiveValidators']>[0],
  callback: Parameters<ActiveValidatorsModel['saveActiveValidators']>[1]
) {
  const { chain_identifier, month, year, active_validators_pubkeys_array } = body;
  ActiveValidators
    .findOne({ chain_identifier: chain_identifier, month: month, year: year })
    .then(activeValidatorsRecord => {

      if (activeValidatorsRecord) {
        activeValidatorsRecord?.active_validators.push(active_validators_pubkeys_array);
        activeValidatorsRecord.save();
        return callback(null, activeValidatorsRecord);
      }

      const newRecordActiveValidators: string[][] = [];
      newRecordActiveValidators.push(active_validators_pubkeys_array);

      ActiveValidators
        .create({
          chain_identifier: chain_identifier,
          month: month,
          year: year,
          active_validators: newRecordActiveValidators
        })
        .then(newActiveValidatorsRecord => callback(null, newActiveValidatorsRecord))
        .catch(err => callback(err, null));
    })
    .catch(err => callback(err, null));
}


const ActiveValidators = mongoose.model<ActiveValidatorsInterface, ActiveValidatorsModel>('ActiveValidators', activeValidatorsSchema);

export default ActiveValidators;
