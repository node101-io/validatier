
import async, { each } from 'async';

const ALLOWED_ATTRIBUTE_LIST = ['moniker', 'commission_rate', 'bond_shares', 'liquid_shares'];

export const isRecordChanged = function (oldBody: any, newBody: any, attributesToCompare: string[], callback: (err: string, changedAttributes: string[] | null) => any) {

  if (!oldBody || !newBody || !attributesToCompare) return callback('impossible_error', null);  

  const changedAttributes: string[] = [];

  async.timesSeries(
    attributesToCompare.length, 
    (i, next) => {
      
      const eachAttribute: string = attributesToCompare[i];

      if (
        !ALLOWED_ATTRIBUTE_LIST.includes(eachAttribute) ||
        oldBody[`${eachAttribute}`] == newBody[`${eachAttribute}`]
      ) return next();

      changedAttributes.push(eachAttribute);
      return next();
    }, 
    (err) => {
      if (err) return callback('async_error', null);
      return callback('', changedAttributes)
    }
  )
}
