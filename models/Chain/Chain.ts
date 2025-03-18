
import mongoose, { Schema, Model } from 'mongoose';

export interface ChainInterface {
  name: string;
  pretty_name: string;
  chain_id: string;
  image: string;
  symbol: string;
  decimals: number;
  denom: string;
  rpc_url: string;
}

interface ChainModel extends Model<ChainInterface> {
  saveChain: (
    body: {  
      name: string;
      pretty_name: string;
      chain_id: string;
      image: string;
      symbol: string;
      decimals: number;
      denom: string;
    }, 
    callback: (
      err: string | null,
      newChain: ChainInterface | null
    ) => any
  ) => any;
  getAllChains: (
    callback: (
      err: string | null,
      chains: ChainInterface[] | null,
    ) => any
  ) => void
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
  symbol: {
    type: String,
    unique: true,
    trim: true,
    required: true
  },
  denom: {
    type: String,
    unique: true,
    trim: true,
    required: true
  },
  decimals: {
    type: Number,
    required: true,
    min: 0,
    max: 20
  },
  rpc_url: {
    type: String,
    required: false
  }
});

chainSchema.statics.getAllChains = function (callback: Parameters<ChainModel['getAllChains']>[0]) {
  Chain
    .find({})
    .then(chains => {
      return callback(null, chains);
    })
    .catch(err => callback('bad_request', null))
}

chainSchema.statics.saveChain = function (
  body: Parameters<ChainModel['saveChain']>[0], 
  callback: Parameters<ChainModel['saveChain']>[1]
) {

  const { name, pretty_name, chain_id, image, symbol, decimals, denom } = body;

  Chain
    .findOneAndUpdate(
      { chain_id: chain_id },
      { 
        name: name,
        pretty_name: pretty_name,
        image: image,
        symbol: symbol,
        decimals: decimals,
        denom: denom
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
          symbol: symbol,
          decimals: decimals,
          denom: denom
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
