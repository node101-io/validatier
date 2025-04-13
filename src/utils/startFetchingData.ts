
import { Job_SaveChains } from "../cron/jobs/Job_SaveChains.js";
import Chain from "../models/Chain/Chain.js";
import { getGenesisTxs } from "./getGenesisTxs.js";
import { clearChainData } from "./levelDb.js";
import { processBlocks } from "./processBlocks.js";

const CHAINS_TO_LISTEN = ['celestia', 'lava', 'cosmoshub', 'osmosis'];

export const startFetchingData = () => {
  Job_SaveChains((err, success) => {
    Chain
      .getAllChains((err, chains) => {
        if (err || !chains) return;
        chains.forEach(chain => {
          if (!CHAINS_TO_LISTEN.includes(chain.name)) return;
          clearChainData(chain.name, (err, success) => {
            if (err || !success) return console.log(err);
            if (chain.is_genesis_saved) processBlocks(chain.active_set_last_updated_block_height, chain.last_available_block_height, chain);
            else getGenesisTxs(chain.name, (err, success) => {
              if (err || !success) return console.log(err);
              processBlocks(chain.active_set_last_updated_block_height, chain.last_available_block_height, chain);
            })
          })
        })
      })
  })
}
