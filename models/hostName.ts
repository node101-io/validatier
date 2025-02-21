
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface HostNameInterface extends Document {
  ipAddress: string;
  hostName: string;
  deprecatedAt: Date;
}

interface HostNameModel extends Model<HostNameInterface> {
  saveIpAddressHostName: (body: SaveIpAddressHostNameInterface, callback: (err: string, hostName: HostNameInterface) => any) => any;
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
  HostName.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: string, hostName: HostNameInterface) => {
    if (err) return callback(err);

    isRecordChanged(hostName, body, ["hostingServiceName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, hostName); 

      if (hostName) {
        hostName.deprecatedAt = new Date();
        hostName.save();
      }
      
      HostName.create({ ipAddress: body.ipAddress, hostName: body.hostName }, (err, newHostName) => {
        if (err || !newHostName) return callback("creation_error");
        return callback(null, newHostName);
      })
    })
  })
}


const HostName = mongoose.model<HostNameInterface, HostNameModel>('HostNames', hostNameSchema);

export default HostName;
