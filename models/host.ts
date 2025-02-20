
import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  Host,
  HostModel
} from "../interfaces/host.js";

import { isRecordChanged } from '../utils/isRecordChanged.js';

const hostSchema = new Schema<Host>({
  ipAddress: { type: String, required: true },
  nodePubkey: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostSchema.statics.saveHost = function (body: Host, callback)
{
  Host.findOne({ nodePubkey: body.nodePubkey, deprecatedAt: null }, (err: Error, host: any) => {
    if (err) return callback(err);
    
    isRecordChanged(host, body, ["ipAddress"], (err, isChangeHappened) => {
      if (err) return callback(err);

      if (isChangeHappened) {

        if (host) {
          host.deprecatedAt = new Date();
          host.save();
        }

        const newHost = new Host({
          nodePubkey: body.nodePubkey,
          ipAddress: body.ipAddress
        });
    
        if (newHost) {
          
          newHost.save();
          return callback(null, newHost);

        } else return callback("creation_error");
        
      } else {
        return callback(null, host);
      }
    })
  })
}

const Host = mongoose.model<Host, HostModel>('Hosts', hostSchema);

export default Host;
