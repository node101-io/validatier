
import mongoose, { Schema } from 'mongoose';
import { 
  Location,
  LocationModel,
  SaveIpAddressLocationInterface
} from "../interfaces/location.js";

import { isRecordChanged } from '../utils/isRecordChanged.js';

const locationSchema = new Schema<Location>({
  ipAddress: { type: String, required: true },
  region: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  loc: { type: String, required: true },
  postal: { type: String, required: true },
  deprecatedAt: { type: Date, default: null },
});

locationSchema.statics.saveIpAddressLocation = function (body: SaveIpAddressLocationInterface, callback)
{
  Location.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: Error, location: any) => {
    if (err) return callback(err);

    isRecordChanged(location, body, ["region", "country", "city", "loc", "postal"], (err, isChangeHappened) => {
      if (err) return callback(err);

      if (isChangeHappened) {

        if (location) {
          location.deprecatedAt = new Date();
          location.save();
        }

        const newLocation = new Location({
          ipAddress: body.ipAddress,
          region: body.region,
          country: body.country,
          city: body.city,
          loc: body.loc,
          postal: body.postal
        });
    
        if (newLocation) {
          
          newLocation.save();
          return callback(null, newLocation);

        } else return callback("creation_error");
        
      } else {
        return callback(null, location);
      }
    })
  })
}


const Location = mongoose.model<Location, LocationModel>('Locations', locationSchema);

export default Location;
