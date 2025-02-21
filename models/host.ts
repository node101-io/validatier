
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

interface Host extends Document {
  ipAddress: string;  // primary key
  nodePubkey: string;  // foreign key
  deprecatedAt: Date;
}

interface HostModel extends Model<Host> {
  saveHost: (body: SaveHostInterface, callback: any) => any;
}

interface SaveHostInterface {
  ipAddress: string;
  nodePubkey: string;
}


const hostSchema = new Schema<Host>({
  ipAddress: { type: String, required: true },
  nodePubkey: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostSchema.statics.saveHost = function (body: SaveHostInterface, callback)
{
  Host.findOne({ nodePubkey: body.nodePubkey, deprecatedAt: null }, (err: Error, host: any) => {
    if (err) return callback(err);
    
    isRecordChanged(host, body, ["ipAddress"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, host);

      if (host) {
        host.deprecatedAt = new Date();
        host.save();
      }
      
      const newHost = new Host({
        nodePubkey: body.nodePubkey,
        ipAddress: body.ipAddress
      });
  
      if (!newHost) return callback("creation_error");
        
      newHost.save();
      return callback(null, newHost);
    })
  })
}

const Host = mongoose.model<Host, HostModel>('Hosts', hostSchema);

export default Host;
