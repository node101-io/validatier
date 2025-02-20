
import mongoose, { Schema } from 'mongoose';
import { 
  HostingService,
  HostingServiceModel,
  SaveIpAddressHostingServiceInterface
} from "../interfaces/hostingService.js";

import { isRecordChanged } from '../utils/isRecordChanged.js';

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

      if (isChangeHappened) {

        if (hostingService) {
          hostingService.deprecatedAt = new Date();
          hostingService.save();
        }

        const newHostingService = new HostingService({
          ipAddress: body.ipAddress,
          hostingServiceName: body.hostingServiceName
        });
    
        if (newHostingService) {
          
          newHostingService.save();
          return callback(null, newHostingService);

        } else return callback("creation_error");
        
      } else {
        return callback(null, hostingService);
      }
    })

  })
}


const HostingService = mongoose.model<HostingService, HostingServiceModel>('HostingServices', hostingServiceSchema);

export default HostingService;
