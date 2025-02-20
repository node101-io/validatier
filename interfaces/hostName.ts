import { Model } from "mongoose";

export interface HostName extends Document {
  ipAddress: string;
  hostName: string;
  deprecatedAt: Date;
}

export interface HostNameModel extends Model<HostName> {
  saveIpAddressHostName: (body: SaveIpAddressHostNameInterface, callback: any) => any;
}

export interface SaveIpAddressHostNameInterface {
  ipAddress: string;
  hostName: string;
}
