import { Model } from "mongoose";

export interface Location extends Document {
  ipAddress: string;
  region: string;
  country: string;
  city: string;
  loc: string;
  postal: string;
  deprecatedAt: Date;
}

export interface LocationModel extends Model<Location> {
  saveIpAddressLocation: (body: Location, callback: any) => any;
}
