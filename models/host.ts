
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface HostInterface extends Document {
  ipAddress: string;  // primary key
  nodePubkey: string;  // foreign key
  deprecatedAt: Date;
}

interface HostModel extends Model<HostInterface> {
  saveHost: (body: SaveHostInterface, callback: (err: string, host: HostInterface) => any) => any;
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
  Host.findOne({ nodePubkey: body.nodePubkey, deprecatedAt: null }, (err: string, host: HostInterface) => {
    if (err) return callback(err);
    
    isRecordChanged(host, body, ["ipAddress"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, host);

      if (host) {
        host.deprecatedAt = new Date();
        host.save();
      }

      Host.create({ nodePubkey: body.nodePubkey, ipAddress: body.ipAddress }, (err, newHost) => {
        if (err || !newHost) return callback("creation_error");
        return callback(null, newHost);
      })
    })
  })
}

const Host = mongoose.model<HostInterface, HostModel>('Hosts', hostSchema);

export default Host;
