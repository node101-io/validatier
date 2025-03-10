
import mongoose, { Schema, Model } from 'mongoose';

export interface ChainInterface {
  name: string;
  pretty_name: string;
  chain_id: string;
  image: string;
  rpc_url: string;
  wss_url: string;
}

interface ChainModel extends Model<ChainInterface> {
  saveChain: (
    body: {  
      name: string;
      pretty_name: string;
      chain_id: string;
      image: string;
      rpc_url?: string;
      wss_url?: string;
    }, 
    callback: (
      err: string | null,
      newChain: ChainInterface | null
    ) => any
  ) => any;
}


const chainSchema = new Schema<ChainInterface>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pretty_name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  chain_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  image: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  rpc_url: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    default: ''
  },
  wss_url: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    default: ''
  }
});


chainSchema.statics.saveChain = function (
  body: Parameters<ChainModel['saveChain']>[0], 
  callback: Parameters<ChainModel['saveChain']>[1]
) {

  const { name, pretty_name, chain_id, image, rpc_url, wss_url } = body;

  Chain
    .findOneAndUpdate(
      { chain_id: chain_id },
      { 
        name: name,
        pretty_name: pretty_name,
        image: image,
        rpc_url: rpc_url,
        wss_url: wss_url
      }
    )
    .then((oldChain) => {

      if (oldChain) return callback(null, oldChain);

      Chain
        .create({ 
          name: name,
          pretty_name: pretty_name,
          chain_id: chain_id,
          image: image,
          rpc_url: rpc_url,
          wss_url: wss_url
        })
        .then((newChain: ChainInterface) => {
          if (!newChain) return callback('creation_error', null);
          return callback(null, newChain);
        })
        .catch(err => callback('creation_error', null))
    })
    .catch(err => callback('save_error', null))
}


const Chain = mongoose.model<ChainInterface, ChainModel>('Chains', chainSchema);

export default Chain;
