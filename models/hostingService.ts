import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  CreateNewHostingServiceInterface,
  DeleteHostingServiceInterface,
  HostingServiceByIdInterface
 } from "../interfaces/hostingService.js";

interface HostingService extends Document {
  name: string;
  deletedAt: Date;
}

interface HostingServiceModel extends Model<HostingService> {
  createNewHostingService: (body: CreateNewHostingServiceInterface, callback: any) => any;
  deleteHostingService: (body: DeleteHostingServiceInterface, callback: any) => any;
  getHostingServiceById: (body: HostingServiceByIdInterface, callback: any) => any;
}

const hostingServiceSchema = new Schema<HostingService>({
  name: { type: String, required: true },
  deletedAt: {type: Date, required: false, default: null}
});


hostingServiceSchema.statics.createNewHostingService = function (body: CreateNewHostingServiceInterface, callback)
{
  HostingService.findOne({ name: body.name, deletedAt: null }, (err: Error, hostingService: HostingService) => {
    if (err) return callback(err);

    if (hostingService) return callback('duplicate_key_hosting_service_key', hostingService);
    
    const newHostingService = new HostingService({
      name: body.name
    });

    if (newHostingService) {
      newHostingService.save();
      return callback(null, newHostingService);
    }
    return callback('creation_error');
  })
}

hostingServiceSchema.statics.deleteHostingService = function (body: DeleteHostingServiceInterface, callback)
{
  HostingService.findByIdAndUpdate(
    body.id,
    { deletedAt: Date.now() },
    (err: Error, hostingService: HostingService) => {
      if (err) return callback(err);
      return callback(null, hostingService);
    }
  )
}

hostingServiceSchema.statics.getHostingServiceById = function (body: HostingServiceByIdInterface, callback)
{
  HostingService.findOne({ id: body.id, deletedAt: null }, (err: Error, hostingService: HostingService) => {
    if (err) return callback(err);
    return callback(null, hostingService);
  })
}

const HostingService = mongoose.model<HostingService, HostingServiceModel>('HostingServices', hostingServiceSchema);

export default HostingService;
