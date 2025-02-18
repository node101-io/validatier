
import mongoose, { Schema, Document, Model } from 'mongoose';
import Location from './location.js';
import { 
  CreateNewNodeInterface,
  DeleteNodeInterface,
  NodeByIdInterface
 } from "../interfaces/node.js";
import { CreateOrUpdateLocationInterface } from '../interfaces/location.js';

interface Node extends Document {
  name: string;  
  ipAddress: string;
  hostingServiceId: string; 
  createdAt: Date;
  deletedAt: Date;
}

interface NodeModel extends Model<Node> {
  createNewNode: (body: CreateNewNodeInterface, callback: any) => any;
  deleteNode: (body: DeleteNodeInterface, callback: any) => any;
  getNodeById: (body: NodeByIdInterface, callback: any) => any;
}

const nodeSchema = new Schema<Node>({
  name: { type: String, required: true },
  ipAddress: { type: String, required: true },
  hostingServiceId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now() },
  deletedAt: { type: Date, default: null }
});


nodeSchema.statics.createNewNode = function (body: CreateNewNodeInterface, callback)
{
  Node.findOne({ name: body.name, deletedAt: null }, (err: Error, node: Node) => {
    if (err) return callback(err);

    if (node) return callback('There is already a node with the provided name!');
    
    const newNode = new Node({
      name: body.name,
      ipAddress: body.ipAddress,
      hostingServiceId: body.hostingServiceId
    });

    if (newNode) {

      return Location.createNodeLocation(body.location, (err: Error, location: CreateOrUpdateLocationInterface) => {
        if (err) return callback(err);

        if (location) {
          newNode.save();
          return callback(null, newNode);  
        }
      })
    }
    return callback('Couldn\'t create node, please try again!');
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
