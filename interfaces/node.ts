
import { Model } from "mongoose";

export interface Node extends Document {
  pubkey: string;  // onchain public key
  address: string;  // onchain address
  votingPower: string;
  createdAt: Date;
  deletedAt: Date;
}

export interface NodeModel extends Model<Node> {
  createNewNode: (body: CreateNewNodeInterface, callback: any) => any;
  deleteNode: (body: DeleteNodeInterface, callback: any) => any;
  getNodeById: (body: NodeByIdInterface, callback: any) => any;
}

export interface CreateNewNodeInterface {
  pubkey: {
    algorithm: "ed25519";
    data: Uint8Array;
  };
  votingPower: any;
  address: Uint8Array;
}
export interface DeleteNodeInterface {
  id: string;
}
export interface NodeByIdInterface {
  id: string;
}