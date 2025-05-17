
import mongoose, { Schema, Model } from 'mongoose';
import async from 'async';
import { ChainInterface } from '../Chain/Chain.js';
import Validator from '../Validator/Validator.js';
import { getDateRange } from './functions/getRangeFromIntervalId.js';

interface GraphDataInterface {
  _id: {
    year: number;
    month?: number;
    day?: number;
  },
  selfStakeSum: number;
  rewardSum: number;
  commissionSum: number;
}[]

const byArray: ('d' | 'm' | 'y')[] = ['d', 'm', 'y'];

export interface CacheSummaryGraphInterface {
  chain_identifier: string;
  interval: 'all_time' | 'last_30_days' | 'last_90_days' | 'last_365_days' | 'this_year' | 'last_calendar_year';
  d: GraphDataInterface;
  m: GraphDataInterface;
  y: GraphDataInterface;
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
  selfStakeSum: {
    type: Number,
  },
  rewardSum: {
    type: Number,
  },
  commissionSum: {
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

      async.times(
        byArray.length,
        (j, next2) => {
          Validator.getSummaryGraphData({
            chain_identifier: chain.name,
            bottom_timestamp: bottom,
            top_timestamp: top,
            by: byArray[j]
          }, (err, results) => {
            if (err) return next2(new Error(err));
            CacheSummaryGraph
              .create({
                chain_identifier: chain.name,
                
              })
              .then(createdCacheSummaryGraphData => {
                resultsArray.push(createdCacheSummaryGraphData);
              })
              .catch(err => next2(new Error(err)));
            next2();
          })
        },
        (err) => {
          if (err) return next1(err);
          return next1();
        }
      )
    },
    (err) => {
      if (err) return callback(JSON.stringify(err), null);
      return callback(null, resultsArray);
    }
  )
}

const CacheSummaryGraph = mongoose.model<CacheSummaryGraphInterface, CacheSummaryGraphModel>('Chains', cacheSummaryGraphSchema);

export default CacheSummaryGraph;
