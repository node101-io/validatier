
import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  CreateNodeDataLogInterface,
  NodeDataLogById,
  NodeDataLogArrayByNodeId
} from "../interfaces/nodeDataLog.js";

interface NodeDataLog extends Document {
  timestamp: Date;
  details: string;  
  nodeId: string; 
  latency: number;
  cache: string;
}

interface NodeDataLogModel extends Model<NodeDataLog> {
  CreateNodeDataLogInterface: (body: CreateNodeDataLogInterface, callback: any) => any;
  getNodeDataLogById: (body: CreateNodeDataLogInterface, callback: any) => any;
  getNodeDataLogArrayByNodeId: (body: NodeDataLogArrayByNodeId, callback: any) => any;
}

const nodeDataLogSchema = new Schema<NodeDataLog>({
  timestamp: { type: Date, default: Date.now() },
  details: { type: String, required: true },
  nodeId: { type: String, required: true },
  latency: { type: Number, required: true },
  cache: { type: String, required: false, default: 'N/A' }
});


nodeDataLogSchema.statics.createNodeDataLog = function (body: CreateNodeDataLogInterface, callback)
{
  const newNodeDataLog = new NodeDataLog({
    details: body.details,
    nodeId: body.nodeId,
    latency: body.latency,
    cache: body.cache
  });

  if (newNodeDataLog) {
    newNodeDataLog.save();
    return callback(null, newNodeDataLog);
  }
  return callback('Could not create node data log, please try again!');
}


nodeDataLogSchema.statics.getNodeDataLogById = function(body: NodeDataLogById, callback)
{
  NodeDataLog.findById(body.id, (err: Error, nodeDataLog: NodeDataLog) => {
    if (err) return callback(err);
    return callback(null, nodeDataLog);
  })
}

nodeDataLogSchema.statics.getNodeDataLogArrayByNodeId = function(body: NodeDataLogArrayByNodeId, callback)
{
  NodeDataLog.find({ nodeId: body.nodeId }, (err: Error, nodeDataLogsArray: NodeDataLog[]) => {
    if (err) return callback(err);
    return callback(null, nodeDataLogsArray);
  })
}

const NodeDataLog = mongoose.model<NodeDataLog, NodeDataLogModel>('NodeDataLogs', nodeDataLogSchema);

export default NodeDataLog;
