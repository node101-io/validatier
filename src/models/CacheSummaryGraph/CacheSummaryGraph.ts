
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
}[]

const byArrayMapping = {
  all_time: ['d', 'm', 'y'],
  last_30_days: ['d'],
  last_90_days: ['d', 'm'],
  this_year: ['d', 'm'],
  last_calendar_year: ['d', 'm']
};

export interface CacheSummaryGraphInterface {
  chain_identifier: string;
  interval: 'all_time' | 'last_30_days' | 'last_90_days' | 'last_365_days' | 'this_year' | 'last_calendar_year';
  d?: GraphDataInterface;
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
}, { _id: false });

interface CacheSummaryGraphModel extends Model<CacheSummaryGraphInterface> {
  saveCacheSummaryGraphForChain: (
    body: {
      chain: ChainInterface,
    },
    callback: (
      err: string | null,
      cacheSummaryGraph: CacheSummaryGraphInterface[] | null
    ) => any
  ) => any;
  getCacheSummaryGraphForChain: (
    body: {
      chain_identifier: string
    },
    callback: (
      err: string | null,
      cacheSummaryGraphData: CacheSummaryGraphInterface[] | null
    ) => any
  ) => any
}


const cacheSummaryGraphSchema = new Schema<CacheSummaryGraphInterface>({
  chain_identifier: {
    type: String,
  },
  interval: {
    type: String
  },
  d: [graphDataSchema],
  m: [graphDataSchema],
  y: [graphDataSchema],
});

cacheSummaryGraphSchema.statics.saveCacheSummaryGraphForChain = function (
  body: Parameters<CacheSummaryGraphModel['saveCacheSummaryGraphForChain']>[0],
  callback: Parameters<CacheSummaryGraphModel['saveCacheSummaryGraphForChain']>[1]
) {
  const { chain } = body;

  const dateRangeValuesMapping = getDateRange(new Date(chain.first_available_block_time).getTime());

  const resultsArray: CacheSummaryGraphInterface[] = [];

  async.times(
    Object.keys(dateRangeValuesMapping).length,
    (i, next1) => {
      const eachDateRangeKey = Object.keys(dateRangeValuesMapping)[i];
      const { bottom, top } = dateRangeValuesMapping[eachDateRangeKey as keyof typeof dateRangeValuesMapping];

      const cacheSummaryGraphData: Record<string, any> = {
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
            cacheSummaryGraphData[byArrayMapping[eachDateRangeKey as keyof typeof byArrayMapping][j]] = results;
            next2();
          })
        },
        (err) => {
          if (err) return next1(err);
          CacheSummaryGraph
            .findOneAndUpdate(
              {
                chain_identifier: cacheSummaryGraphData.chain_identifier,
                interval: eachDateRangeKey
              },
              {
                $set: cacheSummaryGraphData
              },
              {
                upsert: true,
                new: true
              }
            )
            .then(createdCacheSummaryGraphData => {
              resultsArray.push(createdCacheSummaryGraphData);
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

cacheSummaryGraphSchema.statics.getCacheSummaryGraphForChain = function (
  body: Parameters<CacheSummaryGraphModel['getCacheSummaryGraphForChain']>[0],
  callback: Parameters<CacheSummaryGraphModel['getCacheSummaryGraphForChain']>[1]
) {
  const { chain_identifier } = body;
  CacheSummaryGraph
    .find({ chain_identifier: chain_identifier })
    .then(results => callback(null, results))
    .catch(err => callback(err, null))
}

const CacheSummaryGraph = mongoose.model<CacheSummaryGraphInterface, CacheSummaryGraphModel>('CacheSummaryGraphs', cacheSummaryGraphSchema);

export default CacheSummaryGraph;
