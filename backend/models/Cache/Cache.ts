
import mongoose, { Schema, Model } from 'mongoose';
import Chain, { ChainInterface, ChainModel } from '../Chain/Chain.js';
import Validator, { ValidatorWithMetricsInterface, ValidatorsSummaryDataInterface } from '../Validator/Validator.js';
import { getDateRange } from './functions/getRangeFromIntervalId.js';
import { SmallGraphDataInterface, GraphDataInterface, ValidatorModel } from '../Validator/Validator.js';
import ActiveValidators, { ActiveValidatorsModel, CummulativeActiveListItemInterface } from '../ActiveValidators/ActiveValidators.js';
import Price, { PriceModel } from '../Price/Price.js';
import { getFormattedCacheData, FormattedCacheData } from './functions/getFormattedCacheData.js';

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
  ) => any;
  generateCacheData: (
    body: {
      chain_identifier: string,
      bottom_timestamp: number,
      top_timestamp: number
    },
    callback: (
      err: string | null,
      cacheData: (Omit<CacheInterface, 'interval'> & { interval?: never }) | null
    ) => any
  ) => any;
  getFormattedCacheForChain: (
    body: {
      chain_identifier: string,
      interval?: string,
      bottom_timestamp: number,
      top_timestamp: number
    },
    callback: (
      err: string | null,
      formattedData: FormattedCacheData | null
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
          if (err) {
            console.error(`[Cache.saveCacheForChain] getSummaryGraphData error for interval ${eachDateRangeKey}:`, err);
          }
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

    // Correct percentage_sold to be additive using summary graph's final point
    const baseSummaryData = rankValidatorsResult.value.results?.summary_data as any;
    const sg = (summaryGraphResults.value.summaryGraphData as unknown) as any[] || [];
    const lastPoint = sg.length > 0 ? sg[sg.length - 1] : null;
    const correctedSummaryData = lastPoint
      ? { ...baseSummaryData, percentage_sold: Math.min(Math.max(Number(lastPoint.percentage_sold) || 0, 0), 100) }
      : baseSummaryData;

    const updateResult = await Cache.updateOne({
      chain_identifier: chain.name,
      interval: eachDateRangeKey
    }, {
      $set: {
        chain_identifier: chain.name,
        interval: eachDateRangeKey,
        validators: rankValidatorsResult.value.results?.validators,
        summary_data: correctedSummaryData,
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

cacheSchema.statics.generateCacheData = async function (
  body: Parameters<CacheModel['generateCacheData']>[0],
  callback: Parameters<CacheModel['generateCacheData']>[1]
) {
  const { chain_identifier, bottom_timestamp, top_timestamp } = body;

  const results = await Promise.allSettled([
    new Promise<{
      err: Parameters<Parameters<ValidatorModel['rankValidators']>[1]>[0]
      results: Parameters<Parameters<ValidatorModel['rankValidators']>[1]>[1]
    }>((resolve) => {
      Validator.rankValidators(
        { sort_by: 'percentage_sold', order: 'asc', bottom_timestamp, top_timestamp, chain_identifier },
        (err, results) => {
          if (err) {
            console.error(`[Cache.generateCacheData] rankValidators error:`, err);
          }
          resolve({ err: err, results: results });
        }
      )
    }),
    new Promise<{
      err: Parameters<Parameters<ValidatorModel['getSummaryGraphData']>[1]>[0]
      summaryGraphData: Parameters<Parameters<ValidatorModel['getSummaryGraphData']>[1]>[1]
    }>((resolve) => {
      Validator.getSummaryGraphData({
        chain_identifier,
        bottom_timestamp,
        top_timestamp,
      }, (err, summaryGraphData) => {
        if (err) {
          console.error(`[Cache.generateCacheData] getSummaryGraphData error:`, err);
        }
        resolve({ err: err, summaryGraphData: summaryGraphData });
      })
    }),
    new Promise<{
      err: Parameters<Parameters<ValidatorModel['getSmallGraphData']>[1]>[0]
      smallGraphData: Parameters<Parameters<ValidatorModel['getSmallGraphData']>[1]>[1]
    }>((resolve) => {
      Validator.getSmallGraphData({
        chain_identifier,
        bottom_timestamp,
        top_timestamp
      }, (err, smallGraphData) => {
        if (err) {
          console.error(`[Cache.generateCacheData] getSmallGraphData error:`, err);
        }
        resolve({ err: err, smallGraphData: smallGraphData });
      })
    }),
    new Promise<{
      err: Parameters<Parameters<PriceModel['getPriceGraphData']>[1]>[0]
      priceGraphData: Parameters<Parameters<PriceModel['getPriceGraphData']>[1]>[1]
    }>((resolve) => {
      Price.getPriceGraphData({
        bottom_timestamp,
        top_timestamp
      }, (err, priceGraphData) => {
        if (err) {
          console.error(`[Cache.generateCacheData] getPriceGraphData error:`, err);
        }
        resolve({ err: err, priceGraphData: priceGraphData });
      })
    }),
    new Promise<{
      err: Parameters<Parameters<ActiveValidatorsModel['getCummulativeActiveListByRange']>[1]>[0]
      cummulativeActiveList: Parameters<Parameters<ActiveValidatorsModel['getCummulativeActiveListByRange']>[1]>[1]
    }>((resolve) => {
      ActiveValidators.getCummulativeActiveListByRange({
        chain_identifier,
        bottom_timestamp,
        top_timestamp
      }, (err, cummulativeActiveList) => {
        if (err) {
          console.error(`[Cache.generateCacheData] getCummulativeActiveListByRange error:`, err);
        }
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
        bottom_timestamp,
        top_timestamp,
        chain_identifier
      }, (err, rangeToCsvDataMapping) => {
        if (err) {
          console.error(`[Cache.generateCacheData] exportCsvForAllRanges error:`, err);
        }
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

  const missingData = [];
  if (!rankValidatorsResult.value.results?.validators) missingData.push('validators');
  if (!rankValidatorsResult.value.results?.summary_data) missingData.push('summary_data');
  if (!summaryGraphResults.value.summaryGraphData) missingData.push('summaryGraphData');
  if (!smallGraphResults.value.smallGraphData) missingData.push('smallGraphData');
  if (!priceGraphResults.value.priceGraphData) missingData.push('priceGraphData');
  if (!cummulativeActiveListResult.value.cummulativeActiveList) missingData.push('cummulativeActiveList');
  if (!exportCsvForAllRangesResult.value.rangeToCsvDataMapping) missingData.push('rangeToCsvDataMapping');

  if (missingData.length > 0) {
    console.error(`[Cache.generateCacheData] Missing data for custom range (${bottom_timestamp} - ${top_timestamp}):`, missingData);
    return callback(`incomplete_data: ${missingData.join(', ')}`, null);
  }

  const cacheData = {
    chain_identifier,
    validators: rankValidatorsResult.value.results!.validators,
    // Use additive percentage_sold from summary graph's last cumulative point
    summary_data: (() => {
      const base = rankValidatorsResult.value.results!.summary_data as any;
      const sg = summaryGraphResults.value.summaryGraphData as unknown as any[];
      const last = Array.isArray(sg) && sg.length > 0 ? sg[sg.length - 1] : null;
      if (!last) return base;
      return { ...base, percentage_sold: Math.min(Math.max(Number(last.percentage_sold) || 0, 0), 100) };
    })(),
    summary_graph: summaryGraphResults.value.summaryGraphData,
    small_graph: smallGraphResults.value.smallGraphData,
    price_graph: priceGraphResults.value.priceGraphData,
    cummulative_active_list: cummulativeActiveListResult.value.cummulativeActiveList,
    export: exportCsvForAllRangesResult.value.rangeToCsvDataMapping,
  } as unknown as Omit<CacheInterface, 'interval'>;

  return callback(null, cacheData);
}

cacheSchema.statics.getFormattedCacheForChain = async function (
  body: Parameters<CacheModel['getFormattedCacheForChain']>[0],
  callback: Parameters<CacheModel['getFormattedCacheForChain']>[1]
) {
  const { chain_identifier, interval, bottom_timestamp, top_timestamp } = body;

  // Predefined intervals that have cached data
  const predefinedIntervals = ['all_time', 'last_90_days', 'last_180_days', 'last_365_days'];
  const intervalToUse = interval || 'last_365_days';

  // Check if this is a predefined interval with cached data
  const isCustomRange = !predefinedIntervals.includes(intervalToUse);

  if (isCustomRange) {
    // Custom date range - generate fresh data without caching
    Cache.generateCacheData(
      {
        chain_identifier,
        bottom_timestamp,
        top_timestamp
      },
      (err, cacheData) => {
        if (err || !cacheData) {
          return callback(err || 'failed_to_generate_cache_data', null);
        }

        const formattedData = getFormattedCacheData(
          cacheData as unknown as CacheInterface,
          bottom_timestamp,
          top_timestamp
        );

        return callback(null, formattedData);
      }
    );
  } else {
    // Predefined interval - use cached data
    Cache.find(
      {
        chain_identifier,
        interval: intervalToUse,
      },
      {
        export: 0
      }
    )
      .then((cacheResults) => {
        if (!cacheResults || cacheResults.length === 0) {
          return callback('cache_not_found', null);
        }

        const cacheData = cacheResults[0];
        // Adjust summary percentage on-the-fly for legacy caches using graph's last cumulative percentage
        const adjustedCacheData = (() => {
          try {
            const sg: any[] = ((cacheData as any).summary_graph as unknown as any[]) || [];
            const last = Array.isArray(sg) && sg.length > 0 ? sg[sg.length - 1] : null;
            if (!last) return cacheData;
            const fixed = {
              ...(cacheData as any)._doc ? { ...(cacheData as any)._doc } : { ...(cacheData as any) }
            };
            fixed.summary_data = {
              ...(fixed.summary_data || {}),
              percentage_sold: Math.min(Math.max(Number(last.percentage_sold) || 0, 0), 100)
            };
            return fixed as any;
          } catch {
            return cacheData as any;
          }
        })();
        const formattedData = getFormattedCacheData(
          adjustedCacheData as any,
          bottom_timestamp,
          top_timestamp
        );

        return callback(null, formattedData);
      })
      .catch((err) => {
        return callback(String(err), null);
      });
  }
}

const Cache = mongoose.models.Caches as CacheModel || mongoose.model<CacheInterface, CacheModel>('Caches', cacheSchema);

export type { FormattedCacheData };
export default Cache;
