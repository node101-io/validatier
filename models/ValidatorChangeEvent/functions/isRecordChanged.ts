
import async from 'async';
import { OldOrNewBodyInterface, ALLOWED_ATTRIBUTE_LIST } from './generateChangeObjectToSave.js';

export const isRecordChanged = function (oldBody: OldOrNewBodyInterface, newBody: OldOrNewBodyInterface, attributesToCompare: (keyof OldOrNewBodyInterface)[], callback: (err: string, changedAttributes: (keyof OldOrNewBodyInterface)[] | null) => any) {

  if (!oldBody || !newBody || !attributesToCompare) return callback('impossible_error', null);  

  const changedAttributes: (keyof OldOrNewBodyInterface)[] = [];

  async.timesSeries(
    attributesToCompare.length, 
    (i, next) => {
      
      const eachAttribute: keyof OldOrNewBodyInterface = attributesToCompare[i];

      if (
        !ALLOWED_ATTRIBUTE_LIST.includes(eachAttribute) ||
        oldBody[eachAttribute] == newBody[eachAttribute]
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
