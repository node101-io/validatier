
import async from 'async';

export const isRecordChanged = function (oldBody: any, newBody: any, attributesToCompare: string[], callback: (err: string, changedAttributes: string[] | null) => any) {

  if (!oldBody) return true;

  const changedAttributes: string[] = [];

  async.timesSeries(attributesToCompare.length, (i, next) => {
    
    const eachAttribute: string = attributesToCompare[i];

    if (oldBody[`${eachAttribute}`] != newBody[`${eachAttribute}`]) {
      changedAttributes.push(eachAttribute);
    }
    next();
  }, (err) => {
    if (err) return callback("async_error", null);
    return callback('', changedAttributes)
  })
}
