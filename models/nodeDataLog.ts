
import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  NodeDataLog,
  NodeDataLogModel,
  CreateNodeDataLogInterface,
  NodeDataLogHistoryByNodePubkeyInterface
} from "../interfaces/nodeDataLog.js";

const nodeDataLogSchema = new Schema<NodeDataLog>({
  timestamp: { type: Date, default: new Date() },
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

nodeDataLogSchema.statics.getNodeDataLogoHistory = function(body: NodeDataLogHistoryByNodePubkeyInterface, callback)
{
  NodeDataLog.find({ nodePubkey: body.nodePubkey })
    .sort({ timestamp: -1 })
    .exec((err, NodeDataLogs) => {
      if (err) return callback(err);
      return callback(null, NodeDataLogs);
    });
}

const NodeDataLog = mongoose.model<NodeDataLog, NodeDataLogModel>('NodeDataLogs', nodeDataLogSchema);

export default NodeDataLog;
