import async from 'async';
import Chain from "../../models/Chain/Chain.js"
import CacheSummaryGraph from '../../models/Cache/Cache.js';

export const Job_SaveCacheSummaryGraphs = (
  callback: (
    err: string | null,
    success: boolean
  ) => any
) => {
  Chain.getAllChains((err, chains) => {
    if (err || !chains) return callback(err, false);
    async.times(
      chains?.length,
      (i, next) => {
        const eachChain = chains[i];
        CacheSummaryGraph.saveCacheForChain({ chain: eachChain }, (err, cacheSummaryGraph) => {
          if (err) return next(new Error(err));
          return next();
        })
      },
      (err) => {
        if (err) return callback(JSON.stringify(err), false);
        return callback(null, true)
      }
    )
  })
}
