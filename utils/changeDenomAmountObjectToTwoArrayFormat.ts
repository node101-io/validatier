
import async from 'async';
import { GeneralRewardObjectInterface } from '../cron/functions/getValidatorUnclaimedRewardsAndComission.js';

interface responseObject {
  denomsArray: string[],
  amountsArray: string[]
}

export const changeDenomAmountObjectToTwoArrayFormat = function (objectArray: GeneralRewardObjectInterface[], callback: (err: string | null, response: responseObject | null) => any) {
  
  let denomsArray: string[] = [];
  let amountsArray: string[] = [];
  
  async.timesSeries(
    objectArray.length, 
    (i, next) => {
      const eachObject = objectArray[i];
      denomsArray.push(eachObject.denom);
      amountsArray.push(eachObject.amount);
      next();
    }, 
    (err) => {
      if (err) return callback('async_error', null);
      return callback(null, {
        denomsArray: denomsArray,
        amountsArray: amountsArray
      })
    }
  )
}
