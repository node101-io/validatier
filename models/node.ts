
import mongoose, { Schema, Document, Model } from 'mongoose';
import Location from './location.js';
import HostingService from './hostingService.js';

import { 
  CreateNewNodeInterface,
  DeleteNodeInterface,
  NodeByIdInterface
 } from "../interfaces/node.js";
import { CreateOrUpdateLocationInterface } from '../interfaces/location.js';

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

  Node.findOne({ address: body.address, deletedAt: null }, (err: Error, node: Node) => {
    if (err) return callback(err);

    if (node) return callback('duplicate_node_ip_address');
  
    Node.findOne({ pubkey: body.pubkey, deletedAt: null }, (err: Error, node: Node) => {
      if (err) return callback(err);

      if (node) return callback('duplicate_node_public_key');

      const newNode = new Node({
        pubkey: body.pubkey.toString(),
        votingPower: body.votingPower.toString(),
        address: body.address.toString()
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
