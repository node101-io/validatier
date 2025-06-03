import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../models/Chain/Chain.js';
import getTxsByHeight, { RETRY_TOTAL } from '../utils/getTxsByHeight.js';
import { DecodedMessage } from '../utils/decodeTxs.js';
import { convertOperatorAddressToBech32 } from '../utils/convertOperatorAddressToBech32.js';
import { ActiveValidatorsInterface } from '../models/ActiveValidators/ActiveValidators.js';
import { bulkSave, clearChainData, getBatchData } from '../utils/levelDb.js';

interface ListenForEventsResult {
  success: boolean,
  inserted_validator_addresses?: string[] | null,
  saved_composite_events_operator_addresses?: string[] | null,
  new_active_set_last_updated_block_time?: number | null,
  saved_active_validators?: ActiveValidatorsInterface | null
}

export const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgCreateValidator',
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.staking.v1beta1.MsgEditValidator',
  '/cosmos.staking.v1beta1.MsgUndelegate',
  '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
  '/cosmos.staking.v1beta1.MsgBeginRedelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
  'slash',
  'coin_spent',
  'coin_received'
];

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
    promises.push(
      new Promise ((resolve, reject) => {
        getTxsByHeight(
          chain.rpc_url,
          height,
          chain.denom,
          chain.bech32_prefix,
          0,
          (err, result) => {
            const { time, decodedTxs } = result;
            
            if (err)
              return reject({
                err: err,
                block_height: result.block_height
              });
            
            timestamp = new Date(time);
            if (!decodedTxs || decodedTxs.length <= 0) return resolve();

            const flattenedDecodedTxs: DecodedMessage[] = decodedTxs.flatMap((obj: { messages: DecodedMessage }) => obj.messages);
            for (const eachMessage of flattenedDecodedTxs) {

              if (!LISTENING_EVENTS.includes(eachMessage.typeUrl)) continue;
              const key = eachMessage.value.validatorAddress || '';
              
              if (!key) {
                if (!compositeEventBlockMap[eachMessage.value.validatorSrcAddress]) {
                  compositeEventBlockMap[eachMessage.value.validatorSrcAddress] = {
                    self_stake: 0,
                    reward: 0,
                    commission: 0,
                    total_stake: 0,
                    total_withdraw: 0,
                    balance_change: 0,
                    slash: 0
                  };
                }
                if (!compositeEventBlockMap[eachMessage.value.validatorDstAddress]) {
                  compositeEventBlockMap[eachMessage.value.validatorDstAddress] = {
                    self_stake: 0,
                    reward: 0,
                    commission: 0,
                    total_stake: 0,
                    total_withdraw: 0,
                    balance_change: 0,
                    slash: 0
                  };
                }
              } else if (!compositeEventBlockMap[key]) 
                compositeEventBlockMap[key] = {
                  self_stake: 0,
                  reward: 0,
                  commission: 0,
                  total_stake: 0,
                  total_withdraw: 0,
                  balance_change: 0,
                  slash: 0
                };
                
              if (
                [
                  '/cosmos.staking.v1beta1.MsgCreateValidator',
                  '/cosmos.staking.v1beta1.MsgEditValidator'
                ].includes(eachMessage.typeUrl)
              ) {
                if (
                  eachMessage.typeUrl == '/cosmos.staking.v1beta1.MsgCreateValidator' && 
                  (!eachMessage.value.pubkey || !eachMessage.value.description.moniker
                )) continue;
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
              }
              const bech32OperatorAddress = eachMessage.value.validatorAddress ? convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix) : '';
              if (
                [
                  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
                ].includes(eachMessage.typeUrl)
              ) {
                if (!eachMessage.value || !eachMessage.value.amount || !eachMessage.value.amount.amount) continue;
                compositeEventBlockMap[key].total_withdraw += parseInt(eachMessage.value.amount.amount);
                if (eachMessage.typeUrl == '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission') 
                  compositeEventBlockMap[key].commission += parseInt(eachMessage.value.amount.amount);
                else if (bech32OperatorAddress == eachMessage.value.delegatorAddress)
                   compositeEventBlockMap[key].reward += parseInt(eachMessage.value.amount.amount);
              
              } else if (
                [
                  '/cosmos.staking.v1beta1.MsgDelegate',
                  '/cosmos.staking.v1beta1.MsgUndelegate',
                  '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
                ].includes(eachMessage.typeUrl)
              ) {
                if (!eachMessage.value || !eachMessage.value.amount || !eachMessage.value.amount.amount) continue;
                const stakeAmount = parseInt(eachMessage.value.amount.amount);
                const additiveTxs = ['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation'];
                compositeEventBlockMap[key].total_stake += additiveTxs.includes(eachMessage.typeUrl) ? stakeAmount : (stakeAmount * -1);
                
                if (bech32OperatorAddress == eachMessage.value.delegatorAddress) 
                  compositeEventBlockMap[key].self_stake += additiveTxs.includes(eachMessage.typeUrl) ? stakeAmount : (stakeAmount * -1);
              } else if (
                ['/cosmos.staking.v1beta1.MsgBeginRedelegate'].includes(eachMessage.typeUrl)
              ) {
                const bech32SrcOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorSrcAddress, chain.denom);
                const bech32DstOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorDstAddress, chain.denom);
                
                const value = parseInt(eachMessage.value.amount.amount);
                
                compositeEventBlockMap[eachMessage.value.validatorSrcAddress].total_stake += (value * -1);
                if (bech32SrcOperatorAddress == eachMessage.value.delegatorAddress)
                  compositeEventBlockMap[eachMessage.value.validatorSrcAddress].self_stake += (value * -1);
                
                compositeEventBlockMap[eachMessage.value.validatorDstAddress].total_stake += value;
                if (bech32DstOperatorAddress == eachMessage.value.delegatorAddress)
                  compositeEventBlockMap[eachMessage.value.validatorDstAddress].self_stake += value;
              } else if (
                ['coin_spent', 'coin_received'].includes(eachMessage.typeUrl)
              ) {
                const changeAmount = parseInt(eachMessage.value.amount.amount);
                compositeEventBlockMap[key].balance_change += eachMessage.typeUrl == 'coin_received'
                  ? changeAmount
                  : -changeAmount;
              } else if (['slash'].includes(eachMessage.typeUrl)) {
                compositeEventBlockMap[key].slash += eachMessage.value.amount;
              }
            }
            resolve();
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
          const blockTimestamp = timestamp ? new Date(timestamp).getTime() : '';
          
          Validator.updateLastVisitedBlock({ chain_identifier: chain.name, block_height: bottom_block_height, block_time: timestamp }, (err, updated_chain) => {
            if (err) return final_callback(`update_last_visited_block_failed: ${err}`, { success: false });
            if (!blockTimestamp || blockTimestamp - chain.active_set_last_updated_block_time <= (86400 * 1000))
              return final_callback(null, result);

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
