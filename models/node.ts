
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Validator, pubkeyToAddress } from "@cosmjs/tendermint-rpc";

import { ed25519PubKeyToHex } from '../utils/addressConversion.js';

export interface NodeInterface extends Document {
  pubkey: string;  // onchain public key
  address: string;  // onchain address
  votingPower: string;
  createdAt: Date;
  deletedAt: Date;
}

interface NodeModel extends Model<NodeInterface> {
  createNewNode: (body: Validator, callback: (err: string, newNode: NodeInterface) => any) => any;
  deleteNode: (body: DeleteNodeInterface, callback: (err: string, node: NodeInterface) => any) => any;
  getNodeById: (body: NodeByIdInterface, callback: (err: string, node: NodeInterface) => any) => any;
}

interface DeleteNodeInterface {
  id: string;
}
interface NodeByIdInterface {
  id: string;
}

const nodeSchema = new Schema<NodeInterface>({
  pubkey: { type: String, required: true },
  address: { type: String, required: true },
  votingPower: { type: String, required: true },
  createdAt: { type: Date, default: new Date() },
  deletedAt: { type: Date, default: null }
});


nodeSchema.statics.createNewNode = function (body: Validator, callback)
{
  if (!body.pubkey) return callback("node_pubkey_not_found");
  
  const addressString = pubkeyToAddress(body.pubkey?.algorithm, body.pubkey?.data).toString();
  const publicKeyString = ed25519PubKeyToHex(body.pubkey?.data);
  const votingPowerString = body.votingPower.toString();

  Node.findOne(
    { $or: [ 
      { address: addressString, deletedAt: null },
      { pubkey: publicKeyString, deletedAt: null }
    ]}, 
    (err: string, node: NodeInterface) => {

      if (err) return callback(err);
      if (node) return callback(null, node);

      const newNode = new Node({
        pubkey: publicKeyString,
        votingPower: votingPowerString,
        address: addressString
      });

      if (!newNode) return callback('creation_error_node');
    
      newNode.save();
      return callback(null, newNode);
    }
  )
}

nodeSchema.statics.deleteNode = function (body: DeleteNodeInterface, callback)
{
  Node.findByIdAndUpdate(
    body.id,
    { deletedAt: new Date() },
    (err: string, node: NodeInterface) => {
      if (err) return callback(err);
      return callback(null, node);
    }
  )
}


nodeSchema.statics.getNodeById = function (body: NodeByIdInterface, callback)
{
  Node.findOne({ id: body.id, deletedAt: null }, (err: string, node: NodeInterface) => {
    if (err) return callback(err);
    return callback(null, node);
  })
}


const Node = mongoose.model<NodeInterface, NodeModel>('Nodes', nodeSchema);

export default Node;
