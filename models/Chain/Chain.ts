
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
  first_available_block_height: number;
  last_available_block_height: number;
  first_available_block_time: Date;
  bech32_prefix: string;
  last_visited_block: number;
  last_visited_block_time: number;
  active_set_last_updated_block_time: number;
  usd_exchange_rate: number;
  is_genesis_saved: boolean;
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
      bech32_prefix: string;
      rpc_url: string;
      first_available_block_height: number;
      last_available_block_height: number;
      first_available_block_time: Date;
      usd_exchange_rate: number
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
  ) => any;
  findChainByIdentifier: (
    body: { chain_identifier: string },
    callback: (
      err: string | null,
      chain: ChainInterface | null
    ) => any
  ) => any;
  markGenesisAsSaved: (
    body: { chain_identifier: string },
    callback: (
      err: string | null,
      chain: ChainInterface | null
    ) => any
  ) => any;
  updateTimeOfLastActiveSetSave: (
    body: { chain_identifier: string, time: number },
    callback: (
      err: string | null,
      chain: ChainInterface | null
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
    required: true,
    trim: true
  },
  first_available_block_height: {
    type: Number,
    required: true 
  },
  last_available_block_height: {
    type: Number,
    required: true 
  },
  first_available_block_time: {
    type: Date,
    required: true
  },
  bech32_prefix: {
    type: String,
    required: true
  },
  last_visited_block: {
    type: Number,
    required: false
  },
  last_visited_block_time: {
    type: Number,
    required: false
  },
  active_set_last_updated_block_time: {
    type: Number,
    required: false
  },
  usd_exchange_rate: {
    type: Number,
    required: true
  },
  is_genesis_saved: {
    type: Boolean,
    required: false,
    default: false
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

  const { name, pretty_name, chain_id, image, symbol, decimals, denom, bech32_prefix, rpc_url, first_available_block_height, last_available_block_height, first_available_block_time, usd_exchange_rate } = body;

  Chain
    .findOneAndUpdate(
      { chain_id: chain_id },
      { 
        usd_exchange_rate: usd_exchange_rate
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
          denom: denom,
          bech32_prefix: bech32_prefix,
          rpc_url: rpc_url,
          first_available_block_height: first_available_block_height,
          last_available_block_height: last_available_block_height,
          first_available_block_time: first_available_block_time,
          usd_exchange_rate: usd_exchange_rate,
          last_visited_block: first_available_block_height,
          last_visited_block_time: first_available_block_time,
          active_set_last_updated_block_time: first_available_block_time
        })
        .then((newChain: ChainInterface) => {
          if (!newChain) return callback('creation_error', null);
          return callback(null, newChain);
        })
        .catch(err => callback(err, null))
    })
    .catch(err => callback(err, null))
}


chainSchema.statics.findChainByIdentifier = function (
  body: Parameters<ChainModel['findChainByIdentifier']>[0],
  callback: Parameters<ChainModel['findChainByIdentifier']>[1],
) {

  const { chain_identifier } = body;

  Chain
    .findOne({ name: chain_identifier })
    .then(chain => {
      if (!chain) return callback('bad_request', null);
      return callback(null, chain);
    })
    .catch(err => callback('bad_request', null))
}


chainSchema.statics.markGenesisAsSaved = function (
  body: Parameters<ChainModel['markGenesisAsSaved']>[0],
  callback: Parameters<ChainModel['markGenesisAsSaved']>[1],
) {
  const { chain_identifier } = body;
  Chain
    .findOneAndUpdate(
      { name: chain_identifier },
      { is_genesis_saved: true }
    )
    .then(chain => callback(null, chain))
    .catch(err => callback(err, null))
}

chainSchema.statics.updateTimeOfLastActiveSetSave = function (
  body: Parameters<ChainModel['updateTimeOfLastActiveSetSave']>[0],
  callback: Parameters<ChainModel['updateTimeOfLastActiveSetSave']>[1],
) {
  const { chain_identifier, time } = body;
  Chain
    .findOneAndUpdate(
      { name: chain_identifier },
      { active_set_last_updated_block_time: time }
    )
    .then(chain => callback(null, chain))
    .catch(err => callback(err, null));
}

const Chain = mongoose.model<ChainInterface, ChainModel>('Chains', chainSchema);

export default Chain;
