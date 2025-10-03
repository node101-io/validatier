import fetch from 'node-fetch';
import Chain from '../models/Chain/Chain.js';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import { convertOperatorAddressToBech32 } from './convertOperatorAddressToBech32.js';
import { DecodedMessage } from './decodeTxs.js';

export const getGenesisTxs = async (chain_identifier: string, callback: (err: string | null, success: Boolean) => any) => {

  Chain.findChainByIdentifier({ chain_identifier: chain_identifier }, (err, chain) => {
      if (err || !chain) return callback('bad_request', false);

      fetch(`https://snapshots.kjnodes.com/${chain.name}/genesis.json`)
        .then(response => response.json())
        .then((data: any) => {

          data = data.app_state
            ? data
            : data.result.genesis

          const validatorsData = data.app_state.staking.validators;
          const activeValidatorsData = data.validators;
          const genesisTxs = data.app_state.genutil.gen_txs;

          const flattenedGenesisTxs: DecodedMessage[] = genesisTxs.flatMap((obj: { body: { messages: DecodedMessage }}) => obj.body.messages);
          validatorsData.push(...flattenedGenesisTxs);

          const day = (new Date(chain.first_available_block_time)).getDate();
          const month = (new Date(chain.first_available_block_time)).getMonth();
          const year = (new Date(chain.first_available_block_time)).getFullYear();

          const validatorMap: Record<string, any> = {};

          const saveManyCompositeEventBlocksBody = {
            chain_identifier: chain_identifier,
            day: day,
            month: month,
            year: year,
            block_height: chain.first_available_block_height,
            saveMapping: {}
          }
          const compositeEventBlockMap: Record<string, any> = {};

          for (let i = 0; i < validatorsData.length; i++) {

            const eachValidator = validatorsData[i];

            const pubkey = eachValidator.consensus_pubkey
              ? eachValidator.consensus_pubkey.key
              : eachValidator.pubkey.key;

            const operatorAddress = eachValidator.operator_address
              ? eachValidator.operator_address
              : eachValidator.validator_address;

            const delegatorAddress = eachValidator.delegator_address
              ? eachValidator.delegator_address
              : convertOperatorAddressToBech32(eachValidator.operator_address, chain.bech32_prefix);

            const commissionRate = eachValidator.commission.commission_rates
              ? eachValidator.commission.commission_rates.rate
              : eachValidator.commission.rate;

            validatorMap[operatorAddress] = {
              pubkey: pubkey,
              commission_rate: commissionRate,
              operator_address: operatorAddress,
              delegator_address: delegatorAddress,
              chain_identifier: chain_identifier,
              moniker: eachValidator.description.moniker,
              description: eachValidator.description.details,
              security_contact: eachValidator.description.securityContact,
              website: eachValidator.description.website,
              keybase_id: eachValidator.description.identity,
              created_at: chain.first_available_block_time
            };

            const totalStake = eachValidator.tokens
              ? eachValidator.tokens
              : eachValidator.value.amount;
            const selfStake = eachValidator.tokens
              ? 0
              : eachValidator.value.amount
            compositeEventBlockMap[operatorAddress] = {
              total_stake: parseInt(totalStake),
              self_stake: parseInt(selfStake)
            }
          }

          saveManyCompositeEventBlocksBody.saveMapping = compositeEventBlockMap;

          Validator.saveManyValidators(validatorMap, (err, validators) => {
            if (err) return callback(err, false);
            CompositeEventBlock.saveManyCompositeEventBlocks(saveManyCompositeEventBlocksBody, (err, savedCompositeEventBlocks) => {
              if (err) return callback(err, false);
              Chain.markGenesisAsSaved({ chain_identifier: chain_identifier }, (err, chainGenesisMarkedAsSaved) => {
                if (err) return callback(err, false);

                let pubkeysOfActiveValidators = null;
                if (activeValidatorsData && activeValidatorsData.length > 0) pubkeysOfActiveValidators = activeValidatorsData.map((v: any) => v.pub_key.value) || [];

                Validator.updateActiveValidatorList({
                  month: month,
                  year: year,
                  day: day,
                  height: chain.first_available_block_height,
                  chain_identifier: chain_identifier,
                  chain_rpc_url: chain.rpc_urls[0],
                  active_validators_pubkeys_array: pubkeysOfActiveValidators
                }, (err, savedActiveValidators) => {
                  if (err) return callback(err, false);
                  console.log(`ACTIVE VALIDATOR LIST UPDATED | TOTAL OF ${savedActiveValidators?.active_validators.length} ACTIVE`);
                  return callback(null, true);
                });
              })
            })
          })
        })
        .catch(err => callback(err, false))
    })
}
