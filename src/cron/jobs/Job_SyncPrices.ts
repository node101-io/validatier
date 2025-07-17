import async from 'async';
import Price from "../../models/Price/Price.js";
import { getAtomPriceByTimestamp } from "../../models/Price/functions/getAtomPriceByTimestamp.js";

const dayMiliseconds = 1000 * 60 * 60 * 24;

export const Job_SyncPrices = (callback: (err: string | null, success: Boolean) => any) => {
  Price.getMostRecentPriceDocument({}, (err, result) => {
    if (err || !result || !result.timestamp) return callback(err, false);
    const currentTimestamp = (new Date()).getTime();

    let timestamp = result?.timestamp;
    let successFlag = 1;
    let current = timestamp;
    
    async.whilst(
      function test(cb) {
        cb(null, current <= currentTimestamp);
      },
      function iteratee(next) {
        const currentTimestampValue = current;
        const d = new Date(currentTimestampValue);
    
        setTimeout(() => {
          getAtomPriceByTimestamp({ token: 'cosmos', timestamp: currentTimestampValue }, (err, price) => {
            console.log(price)
            if (err || !price) {
              successFlag = 0;
              current += dayMiliseconds;
              return next();
            }
      
            const day = d.getDate();
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
      
            Price.savePriceFunction({ day, month, year, price }, (err, result) => {
              if (err || !result) {
                successFlag = 0;
                current += dayMiliseconds;
                return next();
              }
      
              current += dayMiliseconds;
              next();
            });
          });
        }, 20 * 1000);
      },
      function done(err) {
        if (err || !successFlag) return callback('bad_request', false);
        return callback(null, true);
      }
    );
  })
}
