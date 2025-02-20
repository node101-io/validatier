
import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  NodeDataLog,
  NodeDataLogModel,
  CreateNodeDataLogInterface,
  NodeDataLogById,
  NodeDataLogArrayByNodeId
} from "../interfaces/nodeDataLog.js";

const nodeDataLogSchema = new Schema<NodeDataLog>({
  timestamp: { type: Date, default: Date.now() },
  nodePubkey: { type: String, required: true },
  latency: { type: Number, required: true },
});


nodeDataLogSchema.statics.createNodeDataLog = function (body: CreateNodeDataLogInterface, callback)
{
  const newNodeDataLog = new NodeDataLog({
    nodePubkey: body.nodePubkey,
    latency: body.latency,
  });

  if (newNodeDataLog) {
    newNodeDataLog.save();
    return callback(null, newNodeDataLog);
  } else return callback('creation_error');
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
