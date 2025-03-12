
import async from 'async';

export const ALLOWED_ATTRIBUTE_LIST = ['moniker', 'commission_rate', 'bond_shares', 'liquid_shares', 'keybase_id'];

export interface ChangeObjectResultInterface {
  changedAttributes: string[];
  oldBody: string[];
  newBody: string[];
}

export interface OldOrNewBodyInterface {
  moniker?: string;
  commission_rate?: string;
  bond_shares?: string;
  liquid_shares?: string;
  keybase_id?: string;
}

export const generateChangeObjectToSave = function (changedAttributes: (keyof OldOrNewBodyInterface)[], oldBody: OldOrNewBodyInterface, newBody: OldOrNewBodyInterface, callback: (err: string | null, result: ChangeObjectResultInterface | null) => any) {

  let oldBodyResult: string[] = [];
  let newBodyResult: string[] = [];

  if (!changedAttributes) return callback('no_change_occured', null);
  async.timesSeries(
    changedAttributes.length, 
    (i, next) => {

      let changedAttribute: keyof OldOrNewBodyInterface = changedAttributes[i];
      
      if (!ALLOWED_ATTRIBUTE_LIST.includes(changedAttribute)) return next();

      const oldValue = oldBody[changedAttribute];
      const newValue = newBody[changedAttribute];

      if (!oldValue || !newValue) return next();

      oldBodyResult.push(oldValue);
      newBodyResult.push(newValue);

      return next();
    }, 
    (err) => {
      if (err) return callback('async_error', null);
      return callback(null, {
        changedAttributes: changedAttributes,
        oldBody: oldBodyResult,
        newBody: newBodyResult
      })
    }
  )
}
