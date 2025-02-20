
import async from "async";

export const getCacheServerNameFromHeaders = function (headers: any, callback: (err: any, cacheServerName: string) => any) {
  const headersArray: any = [...headers];

  async.timesSeries(headersArray.length, (i, next) => {

    const headersArrayEachAttributeTuple = headersArray[i];

    if (headersArrayEachAttributeTuple[0] == "server") callback(null, headersArrayEachAttributeTuple[1])
    next();
  })
}