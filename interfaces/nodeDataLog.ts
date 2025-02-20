
import { Model } from "mongoose";

export interface NodeDataLog extends Document {
  timestamp: Date;
  nodePubkey: string;
  latency: number;
  /* 
    Aklıma gelen diğer özellikler:
      - Saatlik istek sayısı
      - Başarılı / başarısız istek sayıları
      - CPU RAM verileri
  */
}

export interface NodeDataLogModel extends Model<NodeDataLog> {
  createNodeDataLog: (body: CreateNodeDataLogInterface, callback: any) => any;
  getNodeDataLogoHistory: (body: NodeDataLogHistoryByNodePubkeyInterface, callback: any) => any;
}

export interface CreateNodeDataLogInterface {
  nodePubkey: string; 
  latency: number;
}

export interface NodeDataLogHistoryByNodePubkeyInterface {
  nodePubkey: string;
}
