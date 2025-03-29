
import Chain from "../models/Chain/Chain.js";
import { getGenesisTxs } from "./getGenesisTxs.js";
import { processBlocks } from "./processBlocks.js";

const CHAINS_TO_LISTEN = ['cosmoshub', 'celestia', 'lava', 'osmosis'];

export const startFetchingData = () => {
  Chain
    .getAllChains((err, chains) => {
      if (err || !chains) return;
      chains.forEach(chain => {
        if (!CHAINS_TO_LISTEN.includes(chain.name)) return;
        if (chain.is_genesis_saved) processBlocks(chain.last_visited_block, chain.last_available_block_height, chain.name);
        else getGenesisTxs(chain.name, (err, success) => {
          if (err || !success) return console.log(err);
          processBlocks(chain.last_visited_block, chain.last_available_block_height, chain.name);
        })
      })
    })
}
