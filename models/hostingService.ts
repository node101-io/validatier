
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface HostingServiceInterface extends Document {
  ipAddress: string;
  hostingServiceName: string;
  deprecatedAt: Date;
}

interface HostingServiceModel extends Model<HostingServiceInterface> {
  saveIpAddressHostingService: (body: SaveIpAddressHostingServiceInterface, callback: (err: string, hostingService: HostingServiceInterface) => any) => any;
}

interface SaveIpAddressHostingServiceInterface {
  ipAddress: string;
  hostingServiceName: string;
}

const hostingServiceSchema = new Schema<HostingServiceInterface>({
  ipAddress: { type: String, required: true },
  hostingServiceName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostingServiceSchema.statics.saveIpAddressHostingService = function (body: SaveIpAddressHostingServiceInterface, callback)
{
  HostingService.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: string, hostingService: HostingServiceInterface) => {
    if (err) return callback(err);

    isRecordChanged(hostingService, body, ["hostingServiceName"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, hostingService);

      if (hostingService) {
        hostingService.deprecatedAt = new Date();
        hostingService.save();
      }
      const newHostingService = new HostingService({
        ipAddress: body.ipAddress,
        hostingServiceName: body.hostingServiceName
      });

      if (!newHostingService) return callback("creation_error");
  
      newHostingService.save();
      return callback(null, newHostingService);
    })

  })
}


const HostingService = mongoose.model<HostingServiceInterface, HostingServiceModel>('HostingServices', hostingServiceSchema);

export default HostingService;
