
import mongoose, { Schema, Document, Model } from 'mongoose';
import { pubkeyToAddress } from "@cosmjs/tendermint-rpc";

import { 
  CreateNewNodeInterface,
  DeleteNodeInterface,
  NodeByIdInterface
 } from "../interfaces/node.js";
import { CreateOrUpdateLocationInterface } from '../interfaces/location.js';

import { uint8ArrayToIPv4, ipv4ToUint8Array } from '../utils/ipAddressTypeConversions.js';

/* 

 Name, ip, hosting attributeları için historical değişim tablosu

*/

interface Node extends Document {
  pubkey: string;
  address: string;
  votingPower: string;
  createdAt: Date;
  deletedAt: Date;
}

interface NodeModel extends Model<Node> {
  createNewNode: (body: CreateNewNodeInterface, callback: any) => any;
  deleteNode: (body: DeleteNodeInterface, callback: any) => any;
  getNodeById: (body: NodeByIdInterface, callback: any) => any;
}

const nodeSchema = new Schema<Node>({
  pubkey: { type: String, required: true },
  address: { type: String, required: true },
  votingPower: { type: String, required: true },
  createdAt: { type: Date, default: Date.now() },
  deletedAt: { type: Date, default: null }
});


nodeSchema.statics.createNewNode = function (body: CreateNewNodeInterface, callback)
{

  const ipAddressV4String = uint8ArrayToIPv4(body.address);
  const publicKeyString = pubkeyToAddress(body.pubkey.algorithm, body.pubkey.data).toString();
  const votingPowerString = body.votingPower.toString();

  Node.findOne({ address: ipAddressV4String, deletedAt: null }, (err: Error, node: Node) => {
    if (err) return callback(err);

    if (node) return callback('duplicate_node_ip_address');
  
    Node.findOne({ pubkey: publicKeyString, deletedAt: null }, (err: Error, node: Node) => {
      
      if (err) return callback(err);

      if (node) return callback('duplicate_node_public_key');

      const newNode = new Node({
        pubkey: publicKeyString,
        votingPower: votingPowerString,
        address: ipAddressV4String
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
    { deletedAt: Date.now() },
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
