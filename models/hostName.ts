
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface HostNameInterface extends Document {
  ipAddress: string;
  hostName: string;
  deprecatedAt: Date;
}

interface HostNameModel extends Model<HostNameInterface> {
  saveIpAddressHostName: (body: SaveIpAddressHostNameInterface, callback: (err: string, hostName: HostNameInterface) => any) => any;
  markOldHostNameAsDeprecated: (body: HostNameInterface, callback: (err: string, oldHostNameDeprecated: HostNameInterface) => any) => any;
}

interface SaveIpAddressHostNameInterface {
  ipAddress: string;
  hostName: string;
}


const hostNameSchema = new Schema<HostNameInterface>({
  ipAddress: { type: String, required: true },
  hostName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostNameSchema.statics.saveIpAddressHostName = function (body: SaveIpAddressHostNameInterface, callback)
{
  HostName.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: string, oldHostName: HostNameInterface) => {
    if (err) return callback(err);

    isRecordChanged(oldHostName, body, ["hostingServiceName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, oldHostName); 
      
      HostName.create({ ipAddress: body.ipAddress, hostName: body.hostName }, (err, newHostName) => {
        if (err || !newHostName) return callback("creation_error");
        if (!oldHostName) return callback(null, newHostName);

        HostName.markOldHostNameAsDeprecated(oldHostName, (err: string, oldHostNameDeprecated: HostNameInterface) => {
          if (err || !oldHostNameDeprecated) return callback("mark_as_deprecated_error");
          if (!oldHostName) return callback(null, newHostName);
        })
      })
    })
  })
}


hostNameSchema.statics.markOldHostNameAsDeprecated = function (body: HostNameInterface, callback) {

  HostName.findOneAndUpdate(
    { ipAddress: body.ipAddress, deprecatedAt: null }, 
    { deprecatedAt: new Date() }, 
    (err: string, oldHostNameDeprecated: HostNameInterface) => {
      if (err) return callback(err);
      return callback(null, oldHostNameDeprecated)
    }
  )
}

const HostName = mongoose.model<HostNameInterface, HostNameModel>('HostNames', hostNameSchema);

export default HostName;
