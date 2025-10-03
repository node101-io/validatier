import async from 'async';
import Chain from '../../models/Chain/Chain.js'
import { getLatestBlockHeight } from '../../utils/getLatestBlockHeight.js';

export const Job_SaveChains = (callback: (err: string | null, success: Boolean) => any) => {

  const chainIdentifiers = ['cosmoshub'];

  async.timesSeries(
    chainIdentifiers.length,
    (i, next) => {
      fetch(`https://chains.cosmos.directory/${chainIdentifiers[i]}`)
        .then(response => response.json())
        .then(response => {

          fetch(`https://snapshots.kjnodes.com/_rpc/${chainIdentifiers[i]}.json`)
            .then(node_response => node_response.json())
            .then((node_response: Record<string, { latest_block_height: number }>) => {

              const { latest_block_height } = getLatestBlockHeight(node_response);
              if (!latest_block_height)
                return next(new Error('fetch_error'));

              Chain.updateOne({
                name: chainIdentifiers[i]
              }, {
                last_available_block_height: latest_block_height,
                usd_exchange_rate: response.chain.prices.coingecko[response.chain.display].usd
              }, { upsert: true })
                .then(chain => {
                  if (!chain) return next(new Error('no_chain'));
                  return next();
                })
                .catch(err => next(new Error(err.toString())));
            })
        })
    },
    (err) => {
      if (err) return callback(err.toString(), false);
      return callback(null, true);
    }
  )
}
