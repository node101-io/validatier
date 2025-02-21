
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface HostingServiceInterface extends Document {
  ipAddress: string;
  hostingServiceName: string;
  deprecatedAt: Date;
}

interface HostingServiceModel extends Model<HostingServiceInterface> {
  saveIpAddressHostingService: (body: SaveIpAddressHostingServiceInterface, callback: (err: string, hostingService: HostingServiceInterface) => any) => any;
  markOldHostingServiceAsDeprecated: (body: HostingServiceInterface, callback: (err: string, oldHostingServiceDeprecated: HostingServiceInterface) => any) => any;
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
  HostingService.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: string, oldHostingService: HostingServiceInterface) => {
    if (err) return callback(err);

    isRecordChanged(oldHostingService, body, ['hostingServiceName'], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, oldHostingService);

      HostingService.create({ ipAddress: body.ipAddress, hostingServiceName: body.hostingServiceName }, (err, newHostingService) => {
        if (err || !newHostingService) return callback('creation_error');
        if (!oldHostingService) return callback(null, newHostingService);

        HostingService.markOldHostingServiceAsDeprecated(oldHostingService, (err: string, oldHostingServiceDeprecated: HostingServiceInterface) => {
          if (err || !oldHostingServiceDeprecated) return callback('mark_as_deprecated_error');
          return callback(null, newHostingService);
        })
      })
    })
  })
}

hostingServiceSchema.statics.markOldHostingServiceAsDeprecated = function (body: HostingServiceInterface, callback) {

  HostingService.findOneAndUpdate(
    { ipAddress: body.ipAddress, deprecatedAt: null }, 
    { deprecatedAt: new Date() }, 
    (err: string, oldHostingServiceDeprecated: HostingServiceInterface) => {
      if (err) return callback(err);
      return callback(null, oldHostingServiceDeprecated)
    }
  )
}


const HostingService = mongoose.model<HostingServiceInterface, HostingServiceModel>('HostingServices', hostingServiceSchema);

export default HostingService;
