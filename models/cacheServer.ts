
import mongoose, { Schema } from 'mongoose';
import { 
  CacheServer,
  CacheServerModel
} from "../interfaces/cacheServer.js";

import { isRecordChanged } from '../utils/isRecordChanged.js';

const cacheServerSchema = new Schema<CacheServer>({
  ipAddress: { type: String, required: true },
  cacheServerName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


cacheServerSchema.statics.saveIpAddressCacheServer = function (body: CacheServer, callback)
{
  CacheServer.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, cacheServer: any) => {
    if (err) return callback(err);

    isRecordChanged(cacheServer, body, ["cacheServerName"], (err, isChangeHappened) => {
      if (err) return callback(err);

      if (isChangeHappened) {

        if (cacheServer) {
          cacheServer.deprecatedAt = new Date();
          cacheServer.save();
        }

        const newCacheServer = new CacheServer({
          ipAddress: body.ipAddress,
          cacheServerSchema: body.cacheServerName
        });
    
        if (newCacheServer) {
          
          newCacheServer.save()
          return callback(null, newCacheServer);

        } else return callback("creation_error")
        
      } else {
        return callback(null, cacheServer);
      }
    })
  })
}


const CacheServer = mongoose.model<CacheServer, CacheServerModel>('CacheServers', cacheServerSchema);

export default CacheServer;
