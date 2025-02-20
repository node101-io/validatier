import { Model } from "mongoose";

export interface CacheServer extends Document {
  ipAddress: string;
  cacheServerName: string;
  deprecatedAt: Date;
}

export interface SaveCacheServerInterface {
  ipAddress: string;
  cacheServerName: string;
}

export interface CacheServerModel extends Model<CacheServer> {
  saveIpAddressCacheServer: (body: SaveCacheServerInterface, callback: any) => any;
}
