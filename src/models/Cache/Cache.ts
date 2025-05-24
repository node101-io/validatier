
import mongoose, { Schema, Model } from 'mongoose';
import async from 'async';
import { ChainInterface } from '../Chain/Chain.js';
import Validator from '../Validator/Validator.js';
import { getDateRange } from './functions/getRangeFromIntervalId.js';
import { GraphDataInterface } from '../Validator/Validator.js';

export const byArrayMapping: Record<string, string[]> = {
  all_time: ['d', 'm', 'w', 'y'],
  last_90_days: ['d', 'w', 'm'],
  last_180_days: ['d', 'w', 'm'],
  this_year: ['d', 'm', 'w'],
  last_calendar_year: ['d', 'm', 'w'],
  custom: ['d', 'm', 'w', 'y']
};

export interface CacheInterface {
  type: 'summary_graph' | 'validators' | 'small_graph' | 'summary_data' | 'export',
  chain_identifier: string;
  interval: 'all_time' | 'last_30_days' | 'last_90_days' | 'this_year' | 'last_calendar_year';
  data: {
    d?: GraphDataInterface;
    w?: GraphDataInterface;
    m?: GraphDataInterface;
    y?: GraphDataInterface;
  } | {
    pubkey: string;
    operator_address: string;
    moniker: string;
    website: string;
    commission_rate: string;
    description: string;
    temporary_image_uri: string;
    self_stake: number;
    reward: number;
    commission: number;
    total_stake: number;
    total_withdraw: number;
    percentage_sold: number;
    self_stake_ratio: number;
    chain_identifier: number;
    ratio: number;
    sold: number;
  } | {
    _id: number;
    self_stake_amount: number;
    average_self_stake_ratio: number;
  }[] | {
    percentage_sold: number;
    self_stake_amount: number;
    average_self_stake_ratio: number;
  } | {
    all_time: string;
    yearly: string;
    monthly: string;
    weekly: string;
  }
}

interface CacheModel extends Model<CacheInterface> {
  saveCacheForChain: (
    body: {
      chain: ChainInterface,
    },
    callback: (
      err: string | null,
      cache: CacheInterface[][] | null
    ) => any
  ) => any;
  getCacheForChain: (
    body: {
      chain_identifier: string,
      interval?: string,
      type?: string
    },
    callback: (
      err: string | null,
      cacheData: CacheInterface[] | null
    ) => any
  ) => any
}


const cacheSchema = new Schema<CacheInterface>({
  type: {
    type: String,
    required: true
  },
  chain_identifier: {
    type: String,
    required: true
  },
  interval: {
    type: String,
    required: true
  },
  data: Schema.Types.Mixed
});

cacheSchema.index({ chain_identifier: 1, interval: 1 });
 
cacheSchema.statics.saveCacheForChain = function (
  body: Parameters<CacheModel['saveCacheForChain']>[0],
  callback: Parameters<CacheModel['saveCacheForChain']>[1]
) {
  const { chain } = body;
  const dateRangeValuesMapping = getDateRange(new Date(chain.first_available_block_time).getTime());

  const resultsArray: CacheInterface[][] = [];
  async.timesSeries(
    Object.keys(dateRangeValuesMapping).length,
    (i, next1) => {
      const eachDateRangeKey = Object.keys(dateRangeValuesMapping)[i];
      const { bottom: bottomTimestamp, top: topTimestamp } = dateRangeValuesMapping[eachDateRangeKey as keyof typeof dateRangeValuesMapping];

      Validator.rankValidators(
        {
          chain_identifier: chain.name,
          sort_by: 'percentage_sold',
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp,
          order: 'asc',
          with_photos: true 
        },
        (err, results) => {
          if (err || !results) return next1(err);

          const { summary_data, validators } = results;

          Validator.exportCsvForAllRanges(
            { sort_by: 'percentage_sold', order: 'asc', bottom_timestamp: bottomTimestamp, top_timestamp: topTimestamp, chain_identifier: chain.name },
            (err, rangeToCsvDataMapping) => {
              if (err) return next1({ success: false, err: err });
            
              Validator.getSmallGraphData({
                chain_identifier: chain.name,
                bottom_timestamp: bottomTimestamp,
                top_timestamp: topTimestamp
              }, (err, resultsSmallGraphData) => {
                if (err || !resultsSmallGraphData) return next1(err);

                Validator.getSummaryGraphData({
                  chain_identifier: chain.name,
                  bottom_timestamp: bottomTimestamp,
                  top_timestamp: topTimestamp,
                  by_array: byArrayMapping[eachDateRangeKey as keyof typeof byArrayMapping]
                }, (err, resultsSummaryGraphData) => {
                    if (err) return next1(err);

                    const cacheMapping: Record<string, any> = {};
                    const cacheDataMapping = { summary_data, validators, summary_graph: resultsSummaryGraphData, small_graph: resultsSmallGraphData, export: rangeToCsvDataMapping };

                    Object.keys(cacheDataMapping).forEach(eachCacheType => {
                      cacheMapping[eachCacheType] = {
                        type: eachCacheType,
                        chain_identifier: chain.name,
                        interval: eachDateRangeKey,
                        data: cacheDataMapping[eachCacheType as keyof typeof cacheDataMapping]
                      }
                    });

                    const bulkOps = Object.values(cacheMapping).map((eachCacheMapping: Record<string, any>) => ({
                      updateOne: {
                        filter: {
                          type: eachCacheMapping.type,
                          chain_identifier: eachCacheMapping.chain_identifier,
                          interval: eachCacheMapping.interval
                        },
                        update: { $set: eachCacheMapping },
                        upsert: true
                      }
                    }));

                    Cache.bulkWrite(bulkOps, { ordered: false })
                      .then(bulkResult => {
                        resultsArray.push(Object.values(cacheMapping));
                        return next1();
                      })
                      .catch(err => next1(err));
                  }
                )
              })
            })
        }
      )
    },
    (err: any) => {
      console.log(err)
      if (err) return callback(JSON.stringify(err), null);
      return callback(null, resultsArray);
    }
  )
}

cacheSchema.statics.getCacheForChain = function (
  body: Parameters<CacheModel['getCacheForChain']>[0],
  callback: Parameters<CacheModel['getCacheForChain']>[1]
) {
  Cache
    .find(body)
    .then(results => callback(null, results))
    .catch(err => callback(err, null))
}

const Cache = mongoose.model<CacheInterface, CacheModel>('Caches', cacheSchema);

export default Cache;
