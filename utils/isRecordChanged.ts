
import async from "async";

export const isRecordChanged = function (oldBody: any, newBody: any, attributesToCompare: String[], callback: (err: string | unknown, isChangeHappenedFlag: Boolean | null) => any) {

  if (!oldBody) return true;

  let isChangeHappenedFlag = false;

  async.timesSeries(attributesToCompare.length, (i, next) => {
    
    const eachAttribute = attributesToCompare[i];

    if (oldBody[`${eachAttribute}`] != newBody[`${eachAttribute}`]) {
      isChangeHappenedFlag = true;
    }
    next();
  }, (err: string | unknown) => {
    if (err) return callback(err, null);
    return callback("", isChangeHappenedFlag)
  })
}
