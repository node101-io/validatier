
export interface NodeLocationByNodeIdInterface {
  id: string;
}

export interface CreateOrUpdateLocationInterface {
  nodeId: string;
  region: string;
  latitude: Number;
  longitude: Number;
  altitude: Number;
}
