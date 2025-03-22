
import Chain from "../models/Chain/Chain.js";
import { getGenesisTxs } from "./getGenesisTxs.js";
import { processBlocks } from "./processBlocks.js";

export const startFetchingData = () => {
  Chain
    .getAllChains((err, chains) => {
      if (err || !chains) return;
      chains.forEach(chain => {
        if (chain.is_genesis_saved) processBlocks(chain.last_visited_block, chain.first_available_block_height + 100000, chain.name);
        else getGenesisTxs(chain.name, (err, success) => {
          if (err || !success) return console.log(err);
          return processBlocks(chain.last_visited_block, chain.first_available_block_height + 100000, chain.name);
        })
      })
    })
}
