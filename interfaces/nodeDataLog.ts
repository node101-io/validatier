
export interface CreateNodeDataLogInterface {
  details: string;  
  nodeId: string; 
  latency: number;
  cache: string;
}

export interface NodeDataLogById {
  id: string;
}
export interface NodeDataLogArrayByNodeId {
  nodeId: string;
}
