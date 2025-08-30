
import { Job_SaveChains } from "../cron/jobs/Job_SaveChains.js";
import Chain from "../models/Chain/Chain.js";
import { getGenesisTxs } from "./getGenesisTxs.js";
import { clearChainData, initializeOperatorAddressToWithdrawAddressMapping } from "./levelDb.js";
import { processBlocks } from "./processBlocks.js";

const CHAINS_TO_LISTEN = ['cosmoshub'];

export const startFetchingData = () => {
  Job_SaveChains((err, success) => {
    if (err || !success) return console.log(err);

    Chain.getAllChains((err, chains) => {
      if (err || !chains) return console.log(err);

      chains.forEach(chain => {
        if (!CHAINS_TO_LISTEN.includes(chain.name)) return;
        clearChainData(chain.name, (err, success) => {
          if (err || !success) return console.log(err);

          initializeOperatorAddressToWithdrawAddressMapping(chain.name, (err, success) => {
            if (err || !success) return console.log(err);

            if (chain.is_genesis_saved)
              processBlocks(chain.active_set_last_updated_block_height, chain.last_available_block_height, chain);
            else
              getGenesisTxs(chain.name, (err, success) => {
                if (err || !success) return console.log(err);
                processBlocks(chain.active_set_last_updated_block_height, chain.last_available_block_height, chain);
              })
          })
        })
      })
    })
  })
}
