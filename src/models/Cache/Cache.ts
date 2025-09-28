
import mongoose, { Schema, Model } from 'mongoose';
import Chain, { ChainInterface, ChainModel } from '../Chain/Chain.js';
import Validator, { ValidatorInterface, ValidatorsSummaryDataInterface } from '../Validator/Validator.js';
import { getDateRange } from './functions/getRangeFromIntervalId.js';
import { SmallGraphDataInterface, GraphDataInterface, ValidatorModel } from '../Validator/Validator.js';
import ActiveValidators, { ActiveValidatorsModel, CummulativeActiveListItemInterface } from '../ActiveValidators/ActiveValidators.js';
import Price, { PriceModel } from '../Price/Price.js';

export interface CacheInterface {
  chain_identifier: string;
  interval: 'all_time' | 'last_30_days' | 'last_90_days' | 'last_365_days';
  validators: ValidatorWithMetricsInterface[];
  summary_data: ValidatorsSummaryDataInterface;
  summary_graph: GraphDataInterface[];
  small_graph: SmallGraphDataInterface[];
  price_graph: number[];
  cummulative_active_list: CummulativeActiveListItemInterface[];
  export: Record<string, any>;
}

interface CacheModel extends Model<CacheInterface> {
  saveCacheForChain: (
    body: {
      chain: ChainInterface,
    },
    callback: (
      err: string | null,
      caches: CacheInterface[] | null
    ) => any
  ) => any;
  getCacheForChain: (
    body: {
      chain_identifier: string,
      interval?: string,
      type?: string,
      with_export?: boolean
    },
    callback: (
      err: string | null,
      cacheData: CacheInterface[] | Omit<CacheInterface, 'export'>[] | null
    ) => any
  ) => any
}

const cacheSchema = new Schema<CacheInterface>({
  chain_identifier: {
    type: String,
    required: true
  },
  interval: {
    type: String,
    required: true
  },
  validators: {
    type: Schema.Types.Mixed,
    required: true
  },
  summary_data: {
    type: Schema.Types.Mixed,
    required: true
  },
  summary_graph: {
    type: Schema.Types.Mixed,
    required: true
  },
  small_graph: {
    type: Schema.Types.Mixed,
    required: true
  },
  price_graph: {
    type: Schema.Types.Mixed,
    required: true
  },
  cummulative_active_list: {
    type: Schema.Types.Mixed,
    required: true
  },
  export: {
    type: Schema.Types.Mixed,
    required: true
  }
});

cacheSchema.index({ chain_identifier: 1, interval: 1 });

cacheSchema.statics.saveCacheForChain = async function (
  body: Parameters<CacheModel['saveCacheForChain']>[0],
  callback: Parameters<CacheModel['saveCacheForChain']>[1]
) {
  const { chain } = body;
  const dateRangeValuesMapping = getDateRange(new Date(chain.first_available_block_time).getTime());

  for (const eachDateRangeKey of Object.keys(dateRangeValuesMapping)) {
    const { bottom: bottomTimestamp, top: topTimestamp } = dateRangeValuesMapping[eachDateRangeKey as keyof typeof dateRangeValuesMapping];

    const results = await Promise.allSettled([
      new Promise<{
        err: Parameters<Parameters<ValidatorModel['rankValidators']>[1]>[0]
        results: Parameters<Parameters<ValidatorModel['rankValidators']>[1]>[1]
      }>((resolve) => {
        Validator.rankValidators(
          { sort_by: 'percentage_sold', order: 'asc', bottom_timestamp: bottomTimestamp, top_timestamp: topTimestamp, chain_identifier: chain.name },
          (err, results) => {
            resolve({ err: err, results: results });
          }
        )
      }),
      new Promise<{
        err: Parameters<Parameters<ValidatorModel['getSummaryGraphData']>[1]>[0]
        summaryGraphData: Parameters<Parameters<ValidatorModel['getSummaryGraphData']>[1]>[1]
      }>((resolve) => {
        Validator.getSummaryGraphData({
          chain_identifier: chain.name,
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp,
        }, (err, summaryGraphData) => {
          resolve({ err: err, summaryGraphData: summaryGraphData });
        })
      }),
      new Promise<{
        err: Parameters<Parameters<ValidatorModel['getSmallGraphData']>[1]>[0]
        smallGraphData: Parameters<Parameters<ValidatorModel['getSmallGraphData']>[1]>[1]
      }>((resolve) => {
        Validator.getSmallGraphData({
          chain_identifier: chain.name,
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp
        }, (err, smallGraphData) => {
          resolve({ err: err, smallGraphData: smallGraphData });
        })
      }),
      new Promise<{
        err: Parameters<Parameters<PriceModel['getPriceGraphData']>[1]>[0]
        priceGraphData: Parameters<Parameters<PriceModel['getPriceGraphData']>[1]>[1]
      }>((resolve) => {
        Price.getPriceGraphData({
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp
        }, (err, priceGraphData) => {
          resolve({ err: err, priceGraphData: priceGraphData });
        })
      }),
      new Promise<{
        err: Parameters<Parameters<ActiveValidatorsModel['getCummulativeActiveListByRange']>[1]>[0]
        cummulativeActiveList: Parameters<Parameters<ActiveValidatorsModel['getCummulativeActiveListByRange']>[1]>[1]
      }>((resolve) => {
        ActiveValidators.getCummulativeActiveListByRange({
          chain_identifier: chain.name,
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp
        }, (err, cummulativeActiveList) => {
          resolve({ err: err, cummulativeActiveList: cummulativeActiveList })
        })
      }),
      new Promise<{
        err: Parameters<Parameters<ValidatorModel['exportCsvForAllRanges']>[1]>[0]
        rangeToCsvDataMapping: Parameters<Parameters<ValidatorModel['exportCsvForAllRanges']>[1]>[1]
      }>((resolve) => {
        Validator.exportCsvForAllRanges({
          sort_by: 'percentage_sold',
          order: 'asc',
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp,
          chain_identifier: chain.name
        }, (err, rangeToCsvDataMapping) => {
          resolve({ err: err, rangeToCsvDataMapping: rangeToCsvDataMapping })
        })
      })
    ])

    const [
      rankValidatorsResult,
      summaryGraphResults,
      smallGraphResults,
      priceGraphResults,
      cummulativeActiveListResult,
      exportCsvForAllRangesResult
    ] = results;

    if (
      rankValidatorsResult.status !== 'fulfilled' ||
      summaryGraphResults.status !== 'fulfilled' ||
      smallGraphResults.status !== 'fulfilled' ||
      priceGraphResults.status !== 'fulfilled' ||
      cummulativeActiveListResult.status !== 'fulfilled' ||
      exportCsvForAllRangesResult.status !== 'fulfilled'
    ) {
      return callback(JSON.stringify(results.find((eachResult) => eachResult.status === 'rejected')?.reason), null);
    }

    const updateResult = await Cache.updateOne({
      chain_identifier: chain.name,
      interval: eachDateRangeKey
    }, {
      $set: {
        chain_identifier: chain.name,
        interval: eachDateRangeKey,
        validators: rankValidatorsResult.value.results?.validators,
        summary_data: rankValidatorsResult.value.results?.summary_data,
        summary_graph: summaryGraphResults.value.summaryGraphData,
        small_graph: smallGraphResults.value.smallGraphData,
        price_graph: priceGraphResults.value.priceGraphData,
        cummulative_active_list: cummulativeActiveListResult.value.cummulativeActiveList,
        export: exportCsvForAllRangesResult.value.rangeToCsvDataMapping,
      }
    }, {
      upsert: true
    });

    if (!updateResult.acknowledged) return callback('update_failed', null);
  };

  const caches = await Cache.find({ chain_identifier: chain.name });

  return callback(null, caches);
}

cacheSchema.statics.getCacheForChain = function (
  body: Parameters<CacheModel['getCacheForChain']>[0],
  callback: Parameters<CacheModel['getCacheForChain']>[1]
) {
  Cache
    .find({
      chain_identifier: body.chain_identifier,
      interval: body.interval,
    }, {
      export: body.with_export ? 1 : 0
    })
    .then(results => callback(null, results))
    .catch(err => callback(err, null))
}

const Cache = mongoose.models.Caches as CacheModel || mongoose.model<CacheInterface, CacheModel>('Caches', cacheSchema);

export default Cache;
