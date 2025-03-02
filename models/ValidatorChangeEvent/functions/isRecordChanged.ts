
import async from 'async';
import { OldOrNewBodyInterface, ALLOWED_ATTRIBUTE_LIST } from './generateChangeObjectToSave.js';

export const isRecordChanged = function (oldBody: OldOrNewBodyInterface, newBody: OldOrNewBodyInterface, attributesToCompare: string[], callback: (err: string, changedAttributes: string[] | null) => any) {

  if (!oldBody || !newBody || !attributesToCompare) return callback('impossible_error', null);  

  const changedAttributes: string[] = [];

  async.timesSeries(
    attributesToCompare.length, 
    (i, next) => {
      
      const eachAttribute: string = attributesToCompare[i];

      if (
        !ALLOWED_ATTRIBUTE_LIST.includes(eachAttribute) ||
        oldBody[eachAttribute as keyof typeof oldBody] == newBody[eachAttribute as keyof typeof newBody]
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
