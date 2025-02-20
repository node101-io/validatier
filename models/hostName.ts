
import mongoose, { Schema } from 'mongoose';
import { 
  HostName,
  HostNameModel,
  SaveIpAddressHostNameInterface
} from "../interfaces/hostName.js";

import { isRecordChanged } from '../utils/isRecordChanged.js';

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

      if (isChangeHappened) {

        if (hostName) {
          hostName.deprecatedAt = new Date();
          hostName.save();
        }

        const newHostName = new HostName({
          ipAddress: body.ipAddress,
          hostName: body.hostName
        });
    
        if (newHostName) {
          
          newHostName.save();
          return callback(null, newHostName);

        } else return callback("creation_error");
        
      } else {
        return callback(null, hostName);
      }
    })
  })
}


const HostName = mongoose.model<HostName, HostNameModel>('HostNames', hostNameSchema);

export default HostName;
