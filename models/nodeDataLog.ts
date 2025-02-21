
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface NodeDataLogInterface extends Document {
  timestamp: Date;
  nodePubkey: string;
  latency: number | unknown;
  /* 
    Aklıma gelen diğer özellikler:
      - Saatlik istek sayısı
      - Başarılı / başarısız istek sayıları
      - CPU RAM verileri
  */
}

interface NodeDataLogModel extends Model<NodeDataLogInterface> {
  createNodeDataLog: (body: CreateNodeDataLogInterface, callback: (err: string, nodeDataLog: NodeDataLogInterface) => any) => any;
  getNodeDataLogoHistory: (body: NodeDataLogHistoryByNodePubkeyInterface, callback: (err: string, nodeDataLog: NodeDataLogInterface) => any) => any;
}

interface CreateNodeDataLogInterface {
  nodePubkey: string; 
  latency: number | unknown;
}

interface NodeDataLogHistoryByNodePubkeyInterface {
  nodePubkey: string;
}


const nodeDataLogSchema = new Schema<NodeDataLogInterface>({
  timestamp: { type: Date, default: new Date() },
  nodePubkey: { type: String, required: true },
  latency: { type: Number, required: true },
});


nodeDataLogSchema.statics.createNodeDataLog = function (body: CreateNodeDataLogInterface, callback)
{
  NodeDataLog.create({
    nodePubkey: body.nodePubkey,
    latency: body.latency,
  }, (err, newNodeDataLog) => {
    if (err || !newNodeDataLog) return callback('creation_error');
    return callback(null, newNodeDataLog);
  })
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

const NodeDataLog = mongoose.model<NodeDataLogInterface, NodeDataLogModel>('NodeDataLogs', nodeDataLogSchema);

export default NodeDataLog;
