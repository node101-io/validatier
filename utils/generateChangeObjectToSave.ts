
import async from 'async';

export interface ChangeObjectResultInterface {
  changedAttributes: string[];
  oldBody: string[];
  newBody: string[];
}

export const generateChangeObjectToSave = function (changedAttributes: string[], oldBody: any, newBody: any, callback: (err: string | unknown | null, result: ChangeObjectResultInterface | null) => any) {

  let oldBodyResult: string[] = [];
  let newBodyResult: string[] = [];

  if (!changedAttributes) return callback("no_change_occured", null);
  async.timesSeries(
    changedAttributes.length, 
    (i, next) => {

      const changedAttribute: string = changedAttributes[i];

      const oldValue: string = oldBody[changedAttribute];
      const newValue: string = newBody[changedAttribute];

      oldBodyResult.push(oldValue);
      newBodyResult.push(newValue);

      next();
    }, 
    (err) => {
      if (err) return callback(err, null);
      return callback(null, {
        changedAttributes: changedAttributes,
        oldBody: oldBodyResult,
        newBody: newBodyResult
      })
    }
  )
}
