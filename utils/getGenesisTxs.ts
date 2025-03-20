import async from 'async';
import { convertOperatorAddressToBech32 } from './convertOperatorAddressToBech32.js';
import Chain from '../models/Chain/Chain.js';
import Validator from '../models/Validator/Validator.js';
import { DecodedMessage } from '../utils/decodeTxs.js';

export const getGenesisTxs = async (chain_identifier: string, callback: (err: string | null, success: Boolean) => any) => {

  Chain
    .findOne({ name: chain_identifier })
    .then(async (chain) => {
      
      if (!chain) return callback('bad_request', false);
      const response = await fetch(`https://snapshots.kjnodes.com/${chain.name}/genesis.json`);
      const data = await response.json();
  
      const validatorsData = data.app_state.staking.validators;
      const activeValidatorsData = data.validators;
      const genesisTxs = data.app_state.genutil.gen_txs;

      const flattenedGenesisTxs: DecodedMessage[] = genesisTxs.flatMap((obj: { body: { messages: DecodedMessage }}) => obj.body.messages);
      validatorsData.push(...flattenedGenesisTxs);

      async.timesSeries(
        validatorsData.length,
        (i, next) => {
          const eachValidator = validatorsData[i]
          const delegatorAddress = eachValidator.delegator_address ? eachValidator.delegator_address : convertOperatorAddressToBech32(eachValidator.operator_address, chain_identifier);
          Validator.saveValidator({
            pubkey: eachValidator.consensus_pubkey ? eachValidator.consensus_pubkey.key : eachValidator.pubkey.key,
            commission_rate: eachValidator.commission.commission_rates ? eachValidator.commission.commission_rates.rate : eachValidator.commission.rate,
            operator_address: eachValidator.operator_address ? eachValidator.operator_address : eachValidator.validator_address,
            delegator_address: delegatorAddress ? delegatorAddress : '',
            chain_identifier: chain.name,
            moniker: eachValidator.description.moniker,
            keybase_id: eachValidator.description.identity,
            created_at: chain.first_available_block_time
          }, (err, validator) => {
            
            if (err && !validator) return next(new Error(err));
            return next();
          })
        },
        async (err) => {
          if (err) return callback(err.message, false)
          
          if (!activeValidatorsData || activeValidatorsData.length <= 0) {
            const result = await Validator.updateActiveValidatorList({
              block_time: chain.first_available_block_time,
              height: chain.first_available_block_height,
              chain_identifier: chain.name,
              chain_rpc_url: chain.rpc_url
            });
            console.log(result)
            return callback(null, true);
          } else {
            const pubkeysOfActiveValidators = activeValidatorsData.map((v: any) => v.pub_key.value) || [];           
            Validator.deleteValidatorsNotAppearingActiveSet({ chain_identifier: chain.name , activeValidatorsPubkeys: pubkeysOfActiveValidators, block_time: chain.first_available_block_time }, (err, validatorsRestoredOrDeleted) => {
              if (err) return callback(err, false);
              console.log(err);
              return callback(null, true);
            })
          }
        }
      )
    })
}
