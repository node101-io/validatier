
import { Model } from "mongoose";

export interface NodeDataLog extends Document {
  timestamp: Date;
  nodePubkey: string;
  latency: number;
}

export interface NodeDataLogModel extends Model<NodeDataLog> {
  CreateNodeDataLogInterface: (body: CreateNodeDataLogInterface, callback: any) => any;
  getNodeDataLogById: (body: CreateNodeDataLogInterface, callback: any) => any;
  getNodeDataLogArrayByNodeId: (body: NodeDataLogArrayByNodeId, callback: any) => any;
}

export interface CreateNodeDataLogInterface {
  details: string;  
  nodePubkey: string; 
  latency: number;
}

export interface NodeDataLogById {
  id: string;
}
export interface NodeDataLogArrayByNodeId {
  nodeId: string;
}
