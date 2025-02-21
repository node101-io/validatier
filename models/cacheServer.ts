
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

interface CacheServer extends Document {
  ipAddress: string;
  cacheServerName: string;
  deprecatedAt: Date;
}

interface SaveCacheServerInterface {
  ipAddress: string;
  cacheServerName: string;
}

interface CacheServerModel extends Model<CacheServer> {
  saveIpAddressCacheServer: (body: SaveCacheServerInterface, callback: any) => any;
}


const cacheServerSchema = new Schema<CacheServer>({
  ipAddress: { type: String, required: true },
  cacheServerName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


cacheServerSchema.statics.saveIpAddressCacheServer = function (body: SaveCacheServerInterface, callback)
{
  CacheServer.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, cacheServer: any) => {
    if (err) return callback(err);

    isRecordChanged(cacheServer, body, ["cacheServerName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, cacheServer);

      if (cacheServer) {
        cacheServer.deprecatedAt = new Date();
        cacheServer.save();
      }

      const newCacheServer = new CacheServer({
        ipAddress: body.ipAddress,
        cacheServerSchema: body.cacheServerName
      });

      if(!newCacheServer) return callback("creation_error")
      
      newCacheServer.save()
      return callback(null, newCacheServer);
    })
  })
}


const CacheServer = mongoose.model<CacheServer, CacheServerModel>('CacheServers', cacheServerSchema);

export default CacheServer;
