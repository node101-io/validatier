import { Model } from "mongoose";

export interface HostingService extends Document {
  ipAddress: string;
  hostingServiceName: string;
  deprecatedAt: Date;
}

export interface HostingServiceModel extends Model<HostingService> {
  saveIpAddressHostingService: (body: HostingService, callback: any) => any;
}
