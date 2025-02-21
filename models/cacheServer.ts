
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface CacheServerInterface extends Document {
  ipAddress: string;
  cacheServerName: string;
  deprecatedAt: Date;
}

interface SaveCacheServerInterface {
  ipAddress: string;
  cacheServerName: string;
}

interface CacheServerModel extends Model<CacheServerInterface> {
  saveIpAddressCacheServer: (body: SaveCacheServerInterface, callback: (err: string, cacheServer: CacheServerInterface) => any) => any;
  markOldCacheServerAsDeprecated: (body: CacheServerInterface, callback: (err: string, oldCacheServerDeprecated: CacheServerInterface) => any) => any;
}


const cacheServerSchema = new Schema<CacheServerInterface>({
  ipAddress: { type: String, required: true },
  cacheServerName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


cacheServerSchema.statics.saveIpAddressCacheServer = function (body: SaveCacheServerInterface, callback)
{
  CacheServer.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, oldCacheServer: CacheServerInterface) => {
    if (err) return callback(err);

    isRecordChanged(oldCacheServer, body, ["cacheServerName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, oldCacheServer);

      CacheServer.create({ ipAddress: body.ipAddress, cacheServerSchema: body.cacheServerName }, (err, newCacheServer) => {
        if (err || !newCacheServer) return callback("creation_error")
        if (!oldCacheServer) return callback(null, newCacheServer);

        CacheServer.markOldCacheServerAsDeprecated(oldCacheServer, (err: string, oldCacheServerDeprecated: CacheServerInterface) => {
          if (err || !oldCacheServerDeprecated) return callback("mark_as_deprecated_error")
          return callback(null, newCacheServer);
        })
      })
    })
  })
}


cacheServerSchema.statics.markOldCacheServerAsDeprecated = function (body: CacheServerInterface, callback) {

  CacheServer.findOneAndUpdate(
    { ipAddress: body.ipAddress, deprecatedAt: null }, 
    { deprecatedAt: new Date() }, 
    (err: string, oldCacheServerDeprecated: CacheServerInterface) => {
      if (err) return callback(err);
      return callback(null, oldCacheServerDeprecated)
    }
  )
}



const CacheServer = mongoose.model<CacheServerInterface, CacheServerModel>('CacheServers', cacheServerSchema);

export default CacheServer;
