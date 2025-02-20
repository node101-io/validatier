import { Model } from "mongoose";

export interface Host extends Document {
  ipAddress: string;  // primary key
  nodePubkey: string;  // foreign key
  deprecatedAt: Date;
}

export interface HostModel extends Model<Host> {
  saveHost: (body: Host, callback: any) => any;
}

