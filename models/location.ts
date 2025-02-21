
import mongoose, { Schema, Document, Model } from 'mongoose';

import { isRecordChanged } from '../utils/isRecordChanged.js';

export interface LocationInterface extends Document {
  ipAddress: string;
  region: string;
  country: string;
  city: string;
  loc: string;
  postal: string;
  deprecatedAt: Date;
}

interface LocationModel extends Model<LocationInterface> {
  saveIpAddressLocation: (body: SaveIpAddressLocationInterface, callback: (err: string, location: LocationInterface) => any) => any;
}

interface SaveIpAddressLocationInterface {
  ipAddress: string;
  region: string;
  country: string;
  city: string;
  loc: string;
  postal: string;
}


const locationSchema = new Schema<LocationInterface>({
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
  Location.findOne({ ipAddress: body.ipAddress, deprecatedAt: null }, (err: string, location: LocationInterface) => {
    if (err) return callback(err);

    isRecordChanged(location, body, ["region", "country", "city", "loc", "postal"], (err, isChangeHappened) => {
      if (err) return callback(err);
      if (!isChangeHappened) return callback(null, location);
      
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
    
      if (!newLocation) return callback("creation_error");
          
      newLocation.save();
      return callback(null, newLocation);
    })
  })
}


const Location = mongoose.model<LocationInterface, LocationModel>('Locations', locationSchema);

export default Location;
