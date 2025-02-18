import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  NodeLocationByNodeIdInterface,
  CreateOrUpdateLocationInterface
} from "../interfaces/location.js";

interface Location extends Document {
  nodeId: string;
  region: string;
  latitude: number;  
  longitude: number;  
  altitude?: number;
  deprecatedAt: Date;
}

interface LocationModel extends Model<Location> {
  getCurrentNodeLocationByNodeId: (body: NodeLocationByNodeIdInterface, callback: any) => any;
  getNodeLocationHistoryByNodeId: (body: NodeLocationByNodeIdInterface, callback: any) => any;
  createNodeLocation: (body: CreateOrUpdateLocationInterface, callback: any) => any;
  updateLocationOfAnExistingNode: (body: CreateOrUpdateLocationInterface, callback: any) => any;
}

const locationSchema = new Schema<Location>({
  nodeId: { type: String, required: true },
  region: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  altitude: { type: Number, required: false },
  deprecatedAt: { type: Date, default: null }
});


locationSchema.statics.getCurrentNodeLocationByNodeId = function (body: NodeLocationByNodeIdInterface, callback)
{
  Location.findOne({ nodeId: body.id, deprecatedAt: null}, (err: Error, location: Location) => {
    if (err) return callback(err, null);
    return callback(null, location)
  })
}


locationSchema.statics.getNodeLocationHistoryByNodeId = function (body: NodeLocationByNodeIdInterface, callback)
{
  Location.find({ nodeId: body.id }, (err: Error, location: Location) => {
    if (err) return callback(err, null);
    return callback(null, location)
  })
}


locationSchema.statics.createNodeLocation = function(body: CreateOrUpdateLocationInterface, callback) 
{
  Location.find({ nodeId: body.nodeId }, (err: Error, locations: Location[]) => {
    if (err) return callback(err, null);
    if (locations.length > 0) return callback('A location for the node already exists!');
    
    const newLocationRecord = new Location({
      nodeId: body.nodeId,
      region: body.region,
      latitude: body.latitude,
      longitude: body.longitude,
      altitude: body.altitude,
    })


    if (newLocationRecord) {
      newLocationRecord.save();
      return callback(null, newLocationRecord);
    }
    return callback("Couldn't create new location, please try again!");
  })
}

locationSchema.statics.updateLocationOfAnExistingNode = function(body: CreateOrUpdateLocationInterface, callback)
{
  Location.findOneAndUpdate(
    { nodeId: body.nodeId, deprecatedAt: null }, 
    { deprecatedAt: Date.now() },
    (err: Error, location: Location) => {
    if (err) return callback(err, null);
    
    
    const newLocationRecord = new Location({
      nodeId: body.nodeId,
      region: body.region,
      latitude: body.latitude,
      longitude: body.longitude,
      altitude: body.altitude,
    })


    if (newLocationRecord) {
      newLocationRecord.save();
      return callback(null, newLocationRecord);
    }
    return callback("Couldn't create new location, please try again!");
  })
}


const Location = mongoose.model<Location, LocationModel>('Locations', locationSchema);

export default Location;
