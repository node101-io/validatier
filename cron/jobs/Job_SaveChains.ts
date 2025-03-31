import async from 'async';
import Chain from '../../models/Chain/Chain.js'
import { findNodeWithMinBlockHeight } from '../../utils/findNodeWithMinBlockHeight.js';

export const Job_SaveChains = (callback: (err: string | null, success: Boolean) => any) => {
  
  const chainIdentifiers = [''];

  async.timesSeries(
    chainIdentifiers.length,
    (i, next) => {
      fetch(`https://chains.cosmos.directory/${chainIdentifiers[i]}`)
        .then(response => response.json())
        .then(response => {

          fetch(`https://snapshots.kjnodes.com/_rpc/${chainIdentifiers[i]}.json`)
            .then(node_response => node_response.json())
            .then(node_response => {

              const earliestNode = findNodeWithMinBlockHeight(node_response);
              if (!earliestNode) return next(new Error('fetch_error'));

              Chain.saveChain({
                name: response.chain.chain_name,
                pretty_name: response.chain.pretty_name,
                chain_id: response.chain.chain_id,
                image: response.chain.logo_URIs.png,
                symbol: response.chain.symbol,
                decimals: response.chain.decimals,
                denom: response.chain.denom,
                bech32_prefix: response.chain.bech32_prefix,
                rpc_url:  earliestNode.ip_address,
                first_available_block_height: earliestNode.earliest_block_height,
                last_available_block_height: earliestNode.latest_block_height,
                first_available_block_time: new Date(earliestNode.data_since),
                usd_exchange_rate: response.chain.prices.coingecko[response.chain.display].usd
              }, (err, chain) => {
                if (err && !chain) return next(new Error(err));
                return next();
              })
            })
        })
    },
    (err) => { 
      if (err) return callback('async_error', false);
      return callback(null, true);
    }
  )
}
