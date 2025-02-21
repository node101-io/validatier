
import async from "async";

export const getCacheServerNameFromHeaders = function (headers: any, callback: (err: string, cacheServerName: string) => any) {
  const headersArray: any = [...headers];

  async.timesSeries(headersArray.length, (i, next) => {

    const headersArrayEachAttributeTuple = headersArray[i];

    if (headersArrayEachAttributeTuple[0] == "server") callback("", headersArrayEachAttributeTuple[1])
    next();
  })
}