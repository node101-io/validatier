
import mongoose, { Schema, Model } from 'mongoose';

export interface ActiveValidatorsInterface {
  chain_identifier: string;
  month: number;
  year: number;
  active_validators: {
    day: number;
    pubkeys: string[];
  }[];
}

interface ActiveValidatorsModel extends Model<ActiveValidatorsInterface> {
  saveActiveValidators: (
    body: {
      chain_identifier: string;
      month: number;
      year: number;
      day: number;
      active_validators_pubkeys_array: string[];
    },
    callback: (
      err: string | null,
      savedActiveValidators: ActiveValidatorsInterface | null
    ) => any
  ) => any;
  getActiveValidatorHistoryOfValidator: (
    body: {
      chain_identifier: string;
      bottom_timestamp: number;
      top_timestamp: number;
      pubkey: string;
    },
    callback: (
      err: string | null,
      activeValidatorHistory: {
        active_validators: {
          day: number;
          isActive: boolean;
        }[];
        month: number;
        year: number;
      }[] | null,
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
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  active_validators: [{
    day: Number,
    pubkeys: [String]
  }]
});

activeValidatorsSchema.index({ chain_identifier: 1, year: 1, month: 1 }, { unique: true });

activeValidatorsSchema.statics.saveActiveValidators = function (
  body: Parameters<ActiveValidatorsModel['saveActiveValidators']>[0],
  callback: Parameters<ActiveValidatorsModel['saveActiveValidators']>[1]
) {
  const { chain_identifier, day, month, year, active_validators_pubkeys_array } = body;
  ActiveValidators
    .findOneAndUpdate(
      { 
        chain_identifier: chain_identifier, 
        month: month, 
        year: year,
        "active_validators.day": { $ne: day }
      },
      { 
        $push: { 
          active_validators: {
            day: day,
            pubkeys: active_validators_pubkeys_array
          } 
        } 
      }
    )
    .then(activeValidatorsRecordUpdate => {
      
      if (activeValidatorsRecordUpdate) return callback(null, activeValidatorsRecordUpdate);

      ActiveValidators
      .findOne(
        { 
          chain_identifier: chain_identifier, 
          month: month, 
          year: year,
        }
      ).then(recordDuplicate => {

        if (recordDuplicate) return callback(null, recordDuplicate);

        const newRecordActiveValidators = {
          day: day,
          pubkeys: active_validators_pubkeys_array
        }

        ActiveValidators
          .create({
            chain_identifier: chain_identifier,
            month: month,
            year: year,
            active_validators: [newRecordActiveValidators]
          })
          .then(newActiveValidatorsRecord => callback(null, newActiveValidatorsRecord))
          .catch(err => callback(err, null));
      })
    })
    .catch(err => callback(err, null));
}


activeValidatorsSchema.statics.getActiveValidatorHistoryOfValidator = function (
  body: Parameters<ActiveValidatorsModel['getActiveValidatorHistoryOfValidator']>[0],
  callback: Parameters<ActiveValidatorsModel['getActiveValidatorHistoryOfValidator']>[1]
) {

  const { chain_identifier, bottom_timestamp, top_timestamp, pubkey } = body;

  ActiveValidators.aggregate([
    {
      $match: {
        chain_identifier: chain_identifier,
        year: {
          $gte: (new Date(bottom_timestamp).getFullYear()),
          $lte: (new Date(top_timestamp).getFullYear()),
        },
      },
    },
    {
      $project: {
        year: 1,
        month: 1,
        active_validators: {
          $map: {
            input: "$active_validators",
            as: "each",
            in: {
              day: "$$each.day",
              isActive: {
                $in: [pubkey, "$$each.pubkeys"]
              }
            }
          }
        }
      }
    },
    {
      $sort: {
        chain_identifier: 1,
        year: 1,
        month: 1,
      },
    },
  ])
    .hint({ chain_identifier: 1, year: 1, month: 1 })
    .then(activeValidatorHistory => callback(null, activeValidatorHistory))
    .catch(err => callback(err, null))
}


const ActiveValidators = mongoose.model<ActiveValidatorsInterface, ActiveValidatorsModel>('ActiveValidators', activeValidatorsSchema);

export default ActiveValidators;
