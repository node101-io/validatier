import async from 'async';
import { request } from 'undici';
import { convertOperatorAddressToBech32 } from './convertOperatorAddressToBech32.js';
import Chain from '../models/Chain/Chain.js';
import Validator from '../models/Validator/Validator.js';
import { DecodedMessage } from '../utils/decodeTxs.js';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import ActiveValidators from '../models/ActiveValidators/ActiveValidators.js';

export const getGenesisTxs = async (chain_identifier: string, callback: (err: string | null, success: Boolean) => any) => {

  Chain.findChainByIdentifier({ chain_identifier: chain_identifier }, (err, chain) => {
      if (err || !chain) return callback('bad_request', false);

      request(`https://snapshots.kjnodes.com/${chain.name}/genesis.json`)
        .then(response => response.body.json())
        .then((data: any) => {

          const validatorsData = data.app_state.staking.validators;
          const activeValidatorsData = data.validators; 
          const genesisTxs = data.app_state.genutil.gen_txs;

          const flattenedGenesisTxs: DecodedMessage[] = genesisTxs.flatMap((obj: { body: { messages: DecodedMessage }}) => obj.body.messages);
          validatorsData.push(...flattenedGenesisTxs);

          async.timesSeries(
            validatorsData.length,
            (i, next) => {
              const eachValidator = validatorsData[i]
              const delegatorAddress = eachValidator.delegator_address ? eachValidator.delegator_address : convertOperatorAddressToBech32(eachValidator.operator_address, chain.bech32_prefix);
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

                const totalStake = eachValidator.tokens ? eachValidator.tokens : eachValidator.value.amount;
                const selfStake = eachValidator.tokens ? 0 : eachValidator.value.amount;
                
                CompositeEventBlock.saveCompositeEventBlock({
                  block_height: chain.first_available_block_height,
                  operator_address: eachValidator.operator_address ? eachValidator.operator_address : eachValidator.validator_address,
                  timestamp: (new Date(chain.first_available_block_time)).getTime(),
                  denom: chain.denom,
                  total_stake: totalStake,
                  self_stake: selfStake
                }, (err, newCompositeEventBlock) => {
                  if (err && !newCompositeEventBlock) return next(new Error(err));
                  return next();
                })
              })
            },
            (err) => {
              if (err) return callback(err.message, false)
              
              Chain.markGenesisAsSaved({ chain_identifier: chain_identifier }, (err, chainGenesisMarkedAsSaved) => {
                if (err) return callback(err, false);
                
                const month = (new Date(chain.first_available_block_time)).getMonth();
                const year = (new Date(chain.first_available_block_time)).getFullYear();

                if (!activeValidatorsData || activeValidatorsData.length <= 0) {
                  Validator.updateActiveValidatorList({
                    month: month,
                    year: year,
                    height: chain.first_available_block_height,
                    chain_identifier: chain.name,
                    chain_rpc_url: chain.rpc_url
                  }, (err, savedActiveValidators) => {
                    if (err) return callback(err, false);
                    console.log(`ACTIVE VALIDATOR LIST UPDATED | TOTAL OF ${savedActiveValidators?.active_validators.length} ACTIVE`);
                    return callback(null, true);
                  });
                } else {
                  const pubkeysOfActiveValidators = activeValidatorsData.map((v: any) => v.pub_key.value) || [];           
                  ActiveValidators.saveActiveValidators({
                    chain_identifier: chain_identifier,
                    month: month,
                    year: year,
                    active_validators_pubkeys_array: pubkeysOfActiveValidators
                  }, (err, savedActiveValidators) => {
                    if (err) return callback(err, false);
                    console.log(`ACTIVE VALIDATOR LIST UPDATED | TOTAL OF ${savedActiveValidators?.active_validators.length} ACTIVE`);
                    return callback(null, true);
                  })
                }
              })
            }
          )
        })
        .catch(err => callback(err, false))
    })
}
