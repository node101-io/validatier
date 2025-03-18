import async from 'async';
import axios from 'axios';
import Chain from '../../models/Chain/Chain.js'
import { Job_SaveValidators } from './Job_SaveValidators.js';

export const Job_SaveChains = (callback: (err: string | null, success: Boolean) => any) => {
  
  const chainIdentifiers = ['cosmoshub', 'celestia'];

  async.timesSeries(
    chainIdentifiers.length,
    (i, next) => {
      axios
        .get(`https://chains.cosmos.directory/${chainIdentifiers[i]}`)
        .then(response => {
          Chain.saveChain({
            name: response.data.chain.chain_name,
            pretty_name: response.data.chain.pretty_name,
            chain_id: response.data.chain.chain_id,
            image: response.data.chain.logo_URIs.png,
            symbol: response.data.chain.symbol,
            decimals: response.data.chain.decimals,
            denom: response.data.chain.denom,
          }, (err, chain) => {
            if (err && !chain) return next(new Error(err));
            return next();            
          })
        })
    },
    (err) => {
      if (err) return callback('async_error', false);
      return callback(null, true);
    }
  )
}
