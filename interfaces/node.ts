import { CreateOrUpdateLocationInterface } from "./location.js";

export interface CreateNewNodeInterface {
  pubkey: string;
  votingPower: string;
  address: string;
}
export interface DeleteNodeInterface {
  id: string;
}
export interface NodeByIdInterface {
  id: string;
}