
import mongoose, { Schema, Model } from 'mongoose';
import async from 'async';
import { ChainInterface } from '../Chain/Chain.js';
import Validator from '../Validator/Validator.js';
import { getDateRange } from './functions/getRangeFromIntervalId.js';

export interface GraphDataInterface {
  _id: {
    year: number;
    month?: number;
    day?: number;
  },
  self_stake_sum: number;
  reward_sum: number;
  commission_sum: number;
  total_stake_sum: number;
  total_withdraw_sum: number;
  total_sold: number;
  percentage_sold: number;
}[]

const byArrayMapping = {
  all_time: ['d', 'm', 'w', 'y'],
  last_30_days: ['d', 'w'],
  last_90_days: ['d', 'w', 'm'],
  this_year: ['d', 'm', 'w'],
  last_calendar_year: ['d', 'm', 'w']
};

export interface CacheInterface {
  chain_identifier: string;
  interval: 'all_time' | 'last_30_days' | 'last_90_days' | 'last_365_days' | 'this_year' | 'last_calendar_year';
  d?: GraphDataInterface;
  w?: GraphDataInterface;
  m?: GraphDataInterface;
  y?: GraphDataInterface;
}

const graphDataSchema = new Schema({
  _id: {
    year: {
      type: Number,
    },
    month: {
      type: Number,
    },
    day: {
      type: Number,
    },
  },
  self_stake_sum: {
    type: Number,
  },
  reward_sum: {
    type: Number,
  },
  commission_sum: {
    type: Number,
  },
  total_stake_sum: {
    type: Number,
  },
  total_withdraw_sum: {
    type: Number,
  },
  total_sold: {
    type: Number,
  },
  percentage_sold: {
    type: Number,
  },
}, { _id: false });

interface CacheModel extends Model<CacheInterface> {
  saveCacheForChain: (
    body: {
      chain: ChainInterface,
    },
    callback: (
      err: string | null,
      cache: CacheInterface[] | null
    ) => any
  ) => any;
  getCacheForChain: (
    body: {
      chain_identifier: string
    },
    callback: (
      err: string | null,
      cacheData: CacheInterface[] | null
    ) => any
  ) => any
}


const cacheSchema = new Schema<CacheInterface>({
  chain_identifier: {
    type: String,
  },
  interval: {
    type: String
  },
  d: [graphDataSchema],
  w: [graphDataSchema],
  m: [graphDataSchema],
  y: [graphDataSchema],
});

cacheSchema.statics.saveCacheForChain = function (
  body: Parameters<CacheModel['saveCacheForChain']>[0],
  callback: Parameters<CacheModel['saveCacheForChain']>[1]
) {
  const { chain } = body;

  const dateRangeValuesMapping = getDateRange(new Date(chain.first_available_block_time).getTime());

  const resultsArray: CacheInterface[] = [];

  async.times(
    Object.keys(dateRangeValuesMapping).length,
    (i, next1) => {
      const eachDateRangeKey = Object.keys(dateRangeValuesMapping)[i];
      const { bottom, top } = dateRangeValuesMapping[eachDateRangeKey as keyof typeof dateRangeValuesMapping];

      const cacheData: Record<string, any> = {
        chain_identifier: chain.name,
        interval: eachDateRangeKey,
      }

      async.times(
        byArrayMapping[eachDateRangeKey as keyof typeof byArrayMapping].length,
        (j, next2) => {
          Validator.getSummaryGraphData({
            chain_identifier: chain.name,
            bottom_timestamp: bottom,
            top_timestamp: top,
            by: byArrayMapping[eachDateRangeKey as keyof typeof byArrayMapping][j]
          }, (err, results) => {
            if (err) return next2(new Error(err));
            cacheData[byArrayMapping[eachDateRangeKey as keyof typeof byArrayMapping][j]] = results;
            next2();
          })
        },
        (err) => {
          if (err) return next1(err);
          Cache
            .findOneAndUpdate(
              {
                chain_identifier: cacheData.chain_identifier,
                interval: eachDateRangeKey
              },
              {
                $set: cacheData
              },
              {
                upsert: true,
                new: true
              }
            )
            .then(createdCacheData => {
              resultsArray.push(createdCacheData);
              return next1();
            })
            .catch(err => next1(new Error(err)));
        }
      )
    },
    (err) => {
      if (err) return callback(JSON.stringify(err), null);
      return callback(null, resultsArray);
    }
  )
}

cacheSchema.statics.getCacheForChain = function (
  body: Parameters<CacheModel['getCacheForChain']>[0],
  callback: Parameters<CacheModel['getCacheForChain']>[1]
) {
  const { chain_identifier } = body;
  Cache
    .find({ chain_identifier: chain_identifier })
    .then(results => callback(null, results))
    .catch(err => callback(err, null))
}

const Cache = mongoose.model<CacheInterface, CacheModel>('Caches', cacheSchema);

export default Cache;
