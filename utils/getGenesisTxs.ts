import async from 'async';
import { writeFileSync, readFileSync, existsSync } from "fs";
import { convertOperatorAddressToBech32 } from './convertOperatorAddressToBech32.js';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Chain from '../models/Chain/Chain.js';

export const getGenesisTxs = async (chain_identifier: string, callback: (err: string | null, success: Boolean) => any) => {

  Chain
    .findOne({ name: chain_identifier })
    .then(chain => {
      if (!chain) return callback('bad_request', false);

      const stakingFilePath = './genesis_staking.json';

      if (existsSync(stakingFilePath)) {
        const stakingData = JSON.parse(readFileSync(stakingFilePath, 'utf-8'));
        async.timesSeries(
          stakingData.length, 
          (i, next) => {
            const eachStakingData = stakingData[i];
            convertOperatorAddressToBech32(eachStakingData.validator_address, (err, operatorAddressBech32) => {
              
              if (operatorAddressBech32 != eachStakingData.delegator_address) return next();

              CompositeEventBlock.saveCompositeEventBlock({
                block_height: 1,
                operator_address: eachStakingData.validator_address,
                denom: chain?.denom,
                self_stake: eachStakingData.shares
              }, (err, newCompositeEventBlock) => {
                if (err || !newCompositeEventBlock) return next(new Error('bad_request'));
                return next();
              })
            })
          },
          (err) => {
            return callback(null, true);
          }
        )
      } else {
          fetch('https://snapshots.kjnodes.com/cosmoshub/genesis.json')
            .then(response => response.json())
            .then(response => { 
              writeFileSync('./genesis_staking.json', JSON.stringify(response.app_state.staking.delegations));
              // writeFileSync('./validators.json', JSON.stringify(response.app_state.staking.validators));
            })
      }
    })
}
