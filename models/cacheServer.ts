
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
}


const cacheServerSchema = new Schema<CacheServerInterface>({
  ipAddress: { type: String, required: true },
  cacheServerName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


cacheServerSchema.statics.saveIpAddressCacheServer = function (body: SaveCacheServerInterface, callback)
{
  CacheServer.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, cacheServer: CacheServerInterface) => {
    if (err) return callback(err);

    isRecordChanged(cacheServer, body, ["cacheServerName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, cacheServer);

      if (cacheServer) {
        cacheServer.deprecatedAt = new Date();
        cacheServer.save();
      }

      CacheServer.create({ ipAddress: body.ipAddress, cacheServerSchema: body.cacheServerName }, (err, newCacheServer) => {
        if (err || !newCacheServer) return callback("creation_error")
        return callback(null, newCacheServer);
      })
    })
  })
}


const CacheServer = mongoose.model<CacheServerInterface, CacheServerModel>('CacheServers', cacheServerSchema);

export default CacheServer;
