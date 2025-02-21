
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

interface HostingService extends Document {
  ipAddress: string;
  hostingServiceName: string;
  deprecatedAt: Date;
}

interface HostingServiceModel extends Model<HostingService> {
  saveIpAddressHostingService: (body: SaveIpAddressHostingServiceInterface, callback: any) => any;
}

interface SaveIpAddressHostingServiceInterface {
  ipAddress: string;
  hostingServiceName: string;
}

const hostingServiceSchema = new Schema<HostingService>({
  ipAddress: { type: String, required: true },
  hostingServiceName: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});


hostingServiceSchema.statics.saveIpAddressHostingService = function (body: SaveIpAddressHostingServiceInterface, callback)
{
  HostingService.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, hostingService: any) => {
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


const HostingService = mongoose.model<HostingService, HostingServiceModel>('HostingServices', hostingServiceSchema);

export default HostingService;
