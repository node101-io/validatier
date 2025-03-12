import async from 'async';
import axios from 'axios';
import Chain from "../../models/Chain/Chain.js"

export const Job_SaveChains = (callback: (err: string | null, success: Boolean) => any) => {
  
  const chainIdentifiers = ['agoric', 'cosmoshub', 'lava', 'celestia', 'evmos', 'osmosis'];

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
            rpc_url: '',
            wss_url: ''
          }, (err, chain) => {
            if (err || !chain) return next();
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
