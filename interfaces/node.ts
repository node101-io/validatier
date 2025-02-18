import { CreateOrUpdateLocationInterface } from "./location.js";

export interface CreateNewNodeInterface {
  name: string;
  ipAddress: string;
  hostingServiceId: string;
  location: CreateOrUpdateLocationInterface
}
export interface DeleteNodeInterface {
  id: string;
}
export interface NodeByIdInterface {
  id: string;
}
