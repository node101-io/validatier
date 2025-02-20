import { Model } from "mongoose";

export interface CacheServer extends Document {
  ipAddress: string;
  cacheServerName: string;
  deprecatedAt: Date;
}

export interface CacheServerModel extends Model<CacheServer> {
  saveIpAddressCacheServer: (body: CacheServer, callback: any) => any;
}
