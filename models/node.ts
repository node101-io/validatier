
import mongoose, { Schema, Document, Model } from 'mongoose';
import { pubkeyToAddress } from "@cosmjs/tendermint-rpc";

import { ed25519PubKeyToHex } from '../utils/addressConversion.js';

interface Node extends Document {
  pubkey: string;  // onchain public key
  address: string;  // onchain address
  votingPower: string;
  createdAt: Date;
  deletedAt: Date;
}

interface NodeModel extends Model<Node> {
  createNewNode: (body: CreateNewNodeInterface, callback: any) => any;
  deleteNode: (body: DeleteNodeInterface, callback: any) => any;
  getNodeById: (body: NodeByIdInterface, callback: any) => any;
}

interface CreateNewNodeInterface {
  pubkey: {
    algorithm: "ed25519";
    data: Uint8Array;
  };
  votingPower: any;
  address: Uint8Array;
}
interface DeleteNodeInterface {
  id: string;
}
interface NodeByIdInterface {
  id: string;
}

const nodeSchema = new Schema<Node>({
  pubkey: { type: String, required: true },
  address: { type: String, required: true },
  votingPower: { type: String, required: true },
  createdAt: { type: Date, default: new Date() },
  deletedAt: { type: Date, default: null }
});


nodeSchema.statics.createNewNode = function (body: CreateNewNodeInterface, callback)
{

  const addressString = pubkeyToAddress(body.pubkey.algorithm, body.pubkey.data).toString();
  const publicKeyString = ed25519PubKeyToHex(body.pubkey.data);
  const votingPowerString = body.votingPower.toString();

  Node.findOne({ address: addressString, deletedAt: null }, (err: Error, node: Node) => {
    if (err) return callback(err);

    if (node) return callback(null, node);
  
    Node.findOne({ pubkey: publicKeyString, deletedAt: null }, (err: Error, node: Node) => {
      
      if (err) return callback(err);

      if (node) return callback(null, node);

      const newNode = new Node({
        pubkey: publicKeyString,
        votingPower: votingPowerString,
        address: addressString
      });

      if (newNode) {        
        newNode.save();
        return callback(null, newNode);
      } else {
        return callback('creation_error_node');
      }      
    })
  })
}

nodeSchema.statics.deleteNode = function (body: DeleteNodeInterface, callback)
{
  Node.findByIdAndUpdate(
    body.id,
    { deletedAt: new Date() },
    (err: Error, node: Node) => {
      if (err) return callback(err);
      return callback(null, node);
    }
  )
}


nodeSchema.statics.getNodeById = function (body: NodeByIdInterface, callback)
{
  Node.findOne({ id: body.id, deletedAt: null }, (err: Error, node: Node) => {
    if (err) return callback(err);
    return callback(null, node);
  })
}


const Node = mongoose.model<Node, NodeModel>('Nodes', nodeSchema);

export default Node;
