
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

interface HostName extends Document {
  ipAddress: string;
  hostName: string;
  deprecatedAt: Date;
}

interface HostNameModel extends Model<HostName> {
  saveIpAddressHostName: (body: SaveIpAddressHostNameInterface, callback: any) => any;
}

interface SaveIpAddressHostNameInterface {
  ipAddress: string;
  hostName: string;
}


const hostNameSchema = new Schema<HostName>({
  ipAddress: { type: String, required: true },
  hostName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostNameSchema.statics.saveIpAddressHostName = function (body: SaveIpAddressHostNameInterface, callback)
{
  HostName.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, hostName: any) => {
    if (err) return callback(err);

    isRecordChanged(hostName, body, ["hostingServiceName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, hostName); 

      if (hostName) {
        hostName.deprecatedAt = new Date();
        hostName.save();
      }
      
      const newHostName = new HostName({
        ipAddress: body.ipAddress,
        hostName: body.hostName
      });
  
      if (!newHostName) return callback("creation_error"); 
      
      newHostName.save();
      return callback(null, newHostName);
    })
  })
}


const HostName = mongoose.model<HostName, HostNameModel>('HostNames', hostNameSchema);

export default HostName;
