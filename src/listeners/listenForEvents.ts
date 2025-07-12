import async from 'async';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../models/Chain/Chain.js';
import getTxsByHeight, { RETRY_TOTAL } from '../utils/getTxsByHeight.js';
import { DecodedMessage } from '../utils/decodeTxs.js';
import { convertOperatorAddressToBech32 } from '../utils/convertOperatorAddressToBech32.js';
import { ActiveValidatorsInterface } from '../models/ActiveValidators/ActiveValidators.js';
import { bulkSave, clearChainData, getBatchData, getValidatorsOfWithdrawAddress, setWithdrawAddress } from '../utils/levelDb.js';

export const LISTENING_EVENTS = [
  'create_validator',
  'delegate',
  'complete_unbonding',
  'complete_redelegation',
  'withdraw_rewards',
  'withdraw_commission',
  'slash',
  'transfer',
  'set_withdraw_address'
];

interface ListenForEventsResult {
  success: boolean,
  inserted_validator_addresses?: string[] | null,
  saved_composite_events_operator_addresses?: string[] | null,
  new_active_set_last_updated_block_time?: number | null,
  saved_active_validators?: ActiveValidatorsInterface | null
}

function initializeCompositeBlock () {
  return {
    self_stake: 0,
    reward: 0,
    commission: 0,
    total_stake: 0,
    total_withdraw: 0,
    balance_change: 0,
    slash: 0
  }
}

export const listenForEvents = (
  body: {
    bottom_block_height: number,
    top_block_height: number,
    chain: ChainInterface
  },
  final_callback: (err: string | null, result: ListenForEventsResult) => any
) => {

  const { bottom_block_height, top_block_height, chain } = body;

  const promises: Promise<void>[] = [];
  const validatorMap: Record<string, any> = {};
  const compositeEventBlockMap: Record<string, any> = {};
  let timestamp: Date;

  for (let height = bottom_block_height; height < top_block_height; height++) {

    let fetch_time = false;
    if (height == top_block_height - 1)
      fetch_time = true;

    promises.push(
      new Promise ((resolve, reject) => {
        getTxsByHeight(
          chain.rpc_url,
          height,
          chain.denom,
          chain.bech32_prefix,
          0,
          fetch_time,
          (err, result) => {
            const { time, decodedTxs } = result;
            
            if (err)
              return reject({ err: err, block_height: result.block_height });
            
            if (time)
              timestamp = new Date(time);
            
            if (!decodedTxs || decodedTxs.length <= 0)
              return resolve();

            const flattenedDecodedTxs: DecodedMessage[] = decodedTxs.flatMap((obj: { messages: DecodedMessage }) => obj.messages);

            async.times(
              flattenedDecodedTxs.length,
              (i, next) => {
                const eachMessage = flattenedDecodedTxs[i];

                const key = eachMessage.value.validatorAddress || '';
                
                if (!key && eachMessage.value.validatorSrcAddress && eachMessage.value.validatorDstAddress) {
                  if (!compositeEventBlockMap[eachMessage.value.validatorSrcAddress]) {
                    compositeEventBlockMap[eachMessage.value.validatorSrcAddress] = initializeCompositeBlock();
                  }
                  if (!compositeEventBlockMap[eachMessage.value.validatorDstAddress]) {
                    compositeEventBlockMap[eachMessage.value.validatorDstAddress] = initializeCompositeBlock();
                  }
                } else if (key && !compositeEventBlockMap[key]) {
                  compositeEventBlockMap[key] = initializeCompositeBlock();
                }
                  
                if (
                  [
                    'create_validator',
                  ].includes(eachMessage.typeUrl)
                ) {
                  if (!eachMessage.value.pubkey || !eachMessage.value.description.moniker)
                    return reject({ err: `no_pubkey_or_moniker:${eachMessage.typeUrl}`, block_height: result.block_height });

                  const pubkey: ArrayBuffer = eachMessage.value.pubkey.value;
                  const byteArray = new Uint8Array(Object.values(pubkey).slice(2));
                  const pubkeyBase64 = btoa(String.fromCharCode(...byteArray));
                  
                  const delegatorAddress = eachMessage.value.delegatorAddress 
                    ? eachMessage.value.delegatorAddress 
                    : convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix);

                  validatorMap[key] = {
                    pubkey: pubkeyBase64,
                    operator_address: eachMessage.value.validatorAddress,
                    delegator_address: delegatorAddress,
                    keybase_id: eachMessage.value.description.identity,
                    moniker: eachMessage.value.description.moniker,
                    website: eachMessage.value.description.website,
                    details: eachMessage.value.description.details,
                    security_contant: eachMessage.value.description.securityContact,
                    commission_rate: eachMessage.value.commission.rate,
                    chain_identifier: chain.name,
                    created_at: eachMessage.time,
                  };
                  if (eachMessage.value.value.denom && eachMessage.value.value.amount) {
                    compositeEventBlockMap[key].self_stake += parseInt(eachMessage.value.value.amount);
                    compositeEventBlockMap[key].total_stake += parseInt(eachMessage.value.value.amount);
                  }

                  return setWithdrawAddress(chain.name, eachMessage.value.validatorAddress, delegatorAddress, (err, success) => {
                    if (err || !success) return reject(`${err}:withdraw_address_set_failed:create_validator:${height}`);
                    return next();
                  })
                }
                const bech32OperatorAddress = eachMessage.value.validatorAddress ? convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix) : '';
                if (
                  [
                    'withdraw_rewards',
                    'withdraw_commission'
                  ].includes(eachMessage.typeUrl)
                ) {
                  if (
                    (
                      eachMessage.typeUrl == 'withdraw_rewards' &&
                      !eachMessage.value.delegatorAddress
                    ) ||
                    !eachMessage.value.validatorAddress ||
                    !eachMessage.value.amount
                  ) {
                    console.log(eachMessage)
                    return reject({ err: `neccessary_values_missing:${eachMessage.typeUrl}:${height}`, block_height: result.block_height });
                  }

                  compositeEventBlockMap[key].total_withdraw += parseInt(eachMessage.value.amount);
                  if (eachMessage.typeUrl == 'withdraw_commission') 
                    compositeEventBlockMap[key].commission += parseInt(eachMessage.value.amount);
                  else if (bech32OperatorAddress == eachMessage.value.delegatorAddress)
                    compositeEventBlockMap[key].reward += parseInt(eachMessage.value.amount);

                  return next();
                
                } else if (
                  [
                    'delegate',
                    'complete_unbonding',
                  ].includes(eachMessage.typeUrl)
                ) {
                  if (!eachMessage.value.delegatorAddress || !eachMessage.value.validatorAddress || !eachMessage.value.amount) {
                    console.log(eachMessage)
                    return reject({ err: `neccessary_values_missing:${eachMessage.typeUrl}:${height}`, block_height: result.block_height });
                  }

                  const stakeAmount = parseInt(eachMessage.value.amount);

                  compositeEventBlockMap[key].total_stake += eachMessage.typeUrl == 'delegate'
                    ? stakeAmount 
                    : (stakeAmount * -1);
                  
                  if (bech32OperatorAddress == eachMessage.value.delegatorAddress) 
                    compositeEventBlockMap[key].self_stake += eachMessage.typeUrl == 'delegate'
                      ? stakeAmount 
                      : (stakeAmount * -1);

                  return next();
                } else if (
                  ['complete_redelegation'].includes(eachMessage.typeUrl)
                ) {

                  if (!eachMessage.value.validatorSrcAddress || !eachMessage.value.validatorDstAddress || !eachMessage.value.delegatorAddress || !eachMessage.value.amount) {
                    console.log(eachMessage)
                    return reject({ err: `neccessary_values_missing:${eachMessage.typeUrl}:${height}`, block_height: result.block_height });
                  }

                  const bech32SrcOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorSrcAddress, chain.bech32_prefix);
                  const bech32DstOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorDstAddress, chain.bech32_prefix);
                  
                  const value = parseInt(eachMessage.value.amount);
                  
                  compositeEventBlockMap[eachMessage.value.validatorSrcAddress].total_stake += (value * -1);
                  if (bech32SrcOperatorAddress == eachMessage.value.delegatorAddress)
                    compositeEventBlockMap[eachMessage.value.validatorSrcAddress].self_stake += (value * -1);
                  
                  compositeEventBlockMap[eachMessage.value.validatorDstAddress].total_stake += value;
                  if (bech32DstOperatorAddress == eachMessage.value.delegatorAddress)
                    compositeEventBlockMap[eachMessage.value.validatorDstAddress].self_stake += value;

                  return next();
                } else if (['slash'].includes(eachMessage.typeUrl)) {
                  if (!eachMessage.value.amount) {
                    console.log(eachMessage)
                    return reject({ err: `neccessary_values_missing:${eachMessage.typeUrl}:${height}`, block_height: result.block_height });
                  }
                  compositeEventBlockMap[key].slash += eachMessage.value.amount;
                  return next();
                } else if (
                  eachMessage.typeUrl == 'transfer'
                ) {

                  const amount = parseInt(eachMessage.value.amount);
        
                  getValidatorsOfWithdrawAddress(chain.name, eachMessage.value.validatorAddressSender, (err, senderValidatorAddresses) => {
                    if (err) return reject(err);
                    getValidatorsOfWithdrawAddress(chain.name, eachMessage.value.validatorAddressRecipient, (err, recipientValidatorAddresses) => {
                      if (err) return reject(err);

                      if (senderValidatorAddresses && senderValidatorAddresses.length) {

                        const remainder = amount % senderValidatorAddresses.length;

                        senderValidatorAddresses.forEach((eachValidatorAddress, i) => {
                          if (!compositeEventBlockMap[eachValidatorAddress])
                            compositeEventBlockMap[eachValidatorAddress] = initializeCompositeBlock();
                          compositeEventBlockMap[eachValidatorAddress].balance_change -= Math.floor(amount / senderValidatorAddresses.length);
                          if (i == 0 && remainder)
                            compositeEventBlockMap[eachValidatorAddress].balance_change -= remainder;
                        })
                      }
            
                      if (recipientValidatorAddresses && recipientValidatorAddresses.length) {

                        const remainder = amount % recipientValidatorAddresses.length;

                        recipientValidatorAddresses.forEach((eachValidatorAddress, i) => {
                          if (!compositeEventBlockMap[eachValidatorAddress])
                            compositeEventBlockMap[eachValidatorAddress] = initializeCompositeBlock();
                          compositeEventBlockMap[eachValidatorAddress].balance_change += Math.floor(amount / recipientValidatorAddresses.length);
                          if (i == 0 && remainder)
                            compositeEventBlockMap[eachValidatorAddress].balance_change += remainder;
                        })
                      }
                      return next();
                    })
                  });
                } else if (eachMessage.typeUrl == 'set_withdraw_address') {
                  const operatorAddressFormat = convertOperatorAddressToBech32(eachMessage.value.delegatorAddress, `${chain.bech32_prefix}valoper`);
                  if (!operatorAddressFormat)
                    return reject(`address_conversion_failed:set_withdraw_address:${height}`);
                  setWithdrawAddress(chain.name, operatorAddressFormat, eachMessage.value.withdrawAddress, (err, success) => {
                    if (err || !success) return reject(`withdraw_address_set_failed:set_withdraw_address:${height}`);
                    return next();
                  })
                } else {
                  return next();
                }
              },
              (err) => {
                if (err)
                  return reject({ err: err, block_height: result.block_height });
                return resolve();
              }
            )
          })
        }
      )
    );
  }
  const result: ListenForEventsResult = {
    inserted_validator_addresses: null,
    saved_composite_events_operator_addresses: null,
    saved_active_validators: null,
    new_active_set_last_updated_block_time: null,
    success: true
  }
  
  Promise.allSettled(promises)
    .then(values => {
      const rejectedValues = values.filter(each => each.status == 'rejected')
      if (rejectedValues.length)
        return final_callback(`${rejectedValues.map((each: any) => each.reason.block_height)} | rejected for ${RETRY_TOTAL} times\nJSON: ${JSON.stringify(rejectedValues)}`, { success: false })

      Validator.saveManyValidators(validatorMap, (err, validators) => {
        if (err) return final_callback(`save_many_validators_failed: ${err}`, { success: false });
        bulkSave({
          chain_identifier: chain.name,
          saveMapping: compositeEventBlockMap
        }, (err, success) => {
          if (err || !success) return final_callback(err, { success: false });
          const insertedValidatorAddresses = validators?.insertedValidators 
            ? validators?.insertedValidators.map(validator => 
              `${validator.operator_address.slice(0,4)}...${validator.operator_address.slice(validator.operator_address.length - 4, validator.operator_address.length)}`
            )
            : [];
          result.inserted_validator_addresses = insertedValidatorAddresses;
          if (!timestamp) return final_callback('no_timestamp_available', { success: false });
          const blockTimestamp = new Date(timestamp).getTime();
          
          Validator.updateLastVisitedBlock({ chain_identifier: chain.name, block_height: bottom_block_height, block_time: timestamp }, (err, updated_chain) => {
            if (err) return final_callback(`update_last_visited_block_failed: ${err}`, { success: false });

            if (
              new Date(timestamp).toLocaleDateString('en-US') ==
              new Date(chain.active_set_last_updated_block_time).toLocaleDateString('en-US')
            ) return final_callback(null, result);

            getBatchData(chain.name, (err, data) => {
              if (err) return final_callback(`get_batch_data_failed: ${err}`, { success: false });
              const day = new Date(blockTimestamp).getDate();
              const month = new Date(blockTimestamp).getMonth();
              const year = new Date(blockTimestamp).getFullYear();
              
              const saveManyCompositeEventBlocksBody = {
                chain_identifier: chain.name,
                day: day,
                month: month,
                year: year,
                block_height: top_block_height,
                saveMapping: data
              };
              CompositeEventBlock.saveManyCompositeEventBlocks(saveManyCompositeEventBlocksBody, (err, savedCompositeEventBlocks) => {
                if (err) return final_callback(`save_many_blocks_failed: ${err}`, { success: false });
                Validator
                  .updateActiveValidatorList({
                    chain_identifier: chain.name,
                    chain_rpc_url: chain.rpc_url,
                    height: bottom_block_height,
                    day: day,
                    month: month,
                    year: year,
                    active_validators_pubkeys_array: null
                  }, (err, savedActiveValidators) => {
                    if (err) return final_callback(`update_active_validators_failed: ${err}`, { success: false });
                    const savedCompositeEventsOperatorAddresses = savedCompositeEventBlocks?.map(each => 
                      `${each.operator_address.slice(0,4)}...${each.operator_address.slice(each.operator_address.length - 4, each.operator_address.length)}`
                    );
                    result.saved_composite_events_operator_addresses = savedCompositeEventsOperatorAddresses;
                    Chain.updateTimeOfLastActiveSetSave({ chain_identifier: chain.name, time: blockTimestamp, height: top_block_height }, (err, activeSetUpdatedChain) => {
                      if (err) return final_callback(`update_last_active_set_data_save_failed: ${err}`, { success: false });
                      result.new_active_set_last_updated_block_time = blockTimestamp;
                      result.saved_active_validators = savedActiveValidators;
                      clearChainData(chain.name, (err, success) => {
                        if (err || !success) return final_callback(`clear_chain_data_failed: ${err}`, { success: false });
                        return final_callback(null, result);
                      })
                    })
                  })
              })
            })
          })
      })
    })
  })
};
