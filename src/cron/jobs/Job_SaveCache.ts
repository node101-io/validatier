import async from 'async';
import Chain from "../../models/Chain/Chain.js"
import CacheSummaryGraph from '../../models/Cache/Cache.js';

export const Job_SaveCache = (
  callback: (
    err: string | null,
    success: boolean
  ) => any
) => {
  Chain.getAllChains((err, chains) => {
    if (err || !chains) return console.log(err);

    async.timesSeries(chains.length, (i, next) => {
      const eachChain = chains[i];

      CacheSummaryGraph.saveCacheForChain({ chain: eachChain }, (err, caches) => {
        if (err) return next(new Error(err));

        console.log(caches);
        return next();
      })
    }, (err) => {
      if (err) return console.log(JSON.stringify(err));

      console.log('Cache saved for all chains');
      return callback(null, true);
    });
  })
}
