
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface HostInterface extends Document {
  ipAddress: string;  // primary key
  nodePubkey: string;  // foreign key
  deprecatedAt: Date;
}

interface HostModel extends Model<HostInterface> {
  saveHost: (body: SaveHostInterface, callback: (err: string, host: HostInterface) => any) => any;
  markOldCacheServerAsDeprecated: (body: HostInterface, callback: (err: string, oldHostDeprecated: HostInterface) => any) => any;
}

interface SaveHostInterface {
  ipAddress: string;
  nodePubkey: string;
}


const hostSchema = new Schema<HostInterface>({
  ipAddress: { type: String, required: true },
  nodePubkey: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostSchema.statics.saveHost = function (body: SaveHostInterface, callback)
{
  Host.findOne({ nodePubkey: body.nodePubkey, deprecatedAt: null }, (err: string, oldHost: HostInterface) => {
    if (err) return callback(err);
    
    isRecordChanged(oldHost, body, ['ipAddress'], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, oldHost);

      Host.create({ nodePubkey: body.nodePubkey, ipAddress: body.ipAddress }, (err, newHost) => {
        if (err || !newHost) return callback('creation_error');
        if (!oldHost) return callback(null, newHost);

        Host.markOldCacheServerAsDeprecated(oldHost, (err: string, oldHostDeprecated: HostInterface) => {
          if (err || !oldHostDeprecated) return callback('mark_as_deprecated_error')
          return callback(null, newHost);
        })
      })
    })
  })
}


hostSchema.statics.markOldHostAsDeprecated = function (body: HostInterface, callback) {

  Host.findOneAndUpdate(
    { nodePubkey: body.nodePubkey, deprecatedAt: null }, 
    { deprecatedAt: new Date() }, 
    (err: string, oldHostDeprecated: HostInterface) => {
      if (err) return callback(err);
      return callback(null, oldHostDeprecated)
    }
  )
}


const Host = mongoose.model<HostInterface, HostModel>('Hosts', hostSchema);

export default Host;
