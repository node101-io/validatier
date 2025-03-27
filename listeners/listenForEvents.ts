import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import Chain from '../models/Chain/Chain.js';
import getTxsByHeight from '../utils/getTxsByHeight.js';
import { DecodedMessage } from '../utils/decodeTxs.js';
import { convertOperatorAddressToBech32 } from '../utils/convertOperatorAddressToBech32.js';

export const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgCreateValidator',
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.staking.v1beta1.MsgEditValidator',
  '/cosmos.staking.v1beta1.MsgUndelegate',
  '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
  '/cosmos.staking.v1beta1.MsgBeginRedelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
  'slash'
];

export const listenForEvents = (
  bottom_block_height: number,
  top_block_height: number,
  chain_identifier: string,
  final_callback: (err: string | null, success: Boolean) => any
) => {
  Chain.findChainByIdentifier({ chain_identifier: chain_identifier }, (err, chain) => {

    if (err || !chain) throw new Error('not_found');
    const promises: Promise<void>[] = [];

    const validatorMap: Record<string, any> = {};
    const compositeEventBlockMap: Record<string, any> = {};
    for (let height = bottom_block_height; height < top_block_height; height++) 
      promises.push(
        new Promise ((resolve, reject) => 
          getTxsByHeight(
            chain.rpc_url, 
            height, 
            chain.denom, 
            chain.bech32_prefix, 
            (err, decodedTxs) => {
            
              if (err) reject(err);
              if (!decodedTxs || decodedTxs.length <= 0) return resolve();
              
              const flattenedDecodedTxs: DecodedMessage[] = decodedTxs.flatMap((obj: { messages: DecodedMessage }) => obj.messages);

              for (const eachMessage of flattenedDecodedTxs) {
                if (!LISTENING_EVENTS.includes(eachMessage.typeUrl)) continue;
                const key = eachMessage.value.validatorAddress ? eachMessage.value.validatorAddress : '';

                const NULL_COMPOSITE_EVENT_BLOCK = {
                  block_height: height,
                  operator_address: key,
                  denom: chain.denom,
                  self_stake: 0,
                  reward: 0,
                  commission: 0,
                  total_stake: 0,
                  total_withdraw: 0,
                  timestamp: new Date(eachMessage.time).getTime()
                }

                if (
                  [
                    '/cosmos.staking.v1beta1.MsgCreateValidator',
                    '/cosmos.staking.v1beta1.MsgEditValidator'
                  ].includes(eachMessage.typeUrl)
                ) {
                  if (!eachMessage.value.pubkey || !eachMessage.value.description.moniker) continue;

                  const pubkey: ArrayBuffer = eachMessage.value.pubkey.value;
                  const byteArray = new Uint8Array(Object.values(pubkey).slice(2));
                  const pubkeyBase64 = btoa(String.fromCharCode(...byteArray));
                  
                  validatorMap[key] = {
                    pubkey: pubkeyBase64,
                    operator_address: eachMessage.value.validatorAddress,
                    delegator_address: eachMessage.value.delegatorAddress ? eachMessage.value.delegatorAddress : convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix),
                    keybase_id: eachMessage.value.description.identity,
                    moniker: eachMessage.value.description.moniker,
                    commission_rate: eachMessage.value.commission.rate,
                    chain_identifier: chain.name,
                    created_at: eachMessage.time,
                  };

                  if (eachMessage.value.value.denom && eachMessage.value.value.amount) {
                    if (!compositeEventBlockMap[key]) 
                      compositeEventBlockMap[key] = NULL_COMPOSITE_EVENT_BLOCK;
                    compositeEventBlockMap[key].self_stake += eachMessage.value.value.amount;
                    compositeEventBlockMap[key].total_stake += eachMessage.value.value.amount;
                  }
                } else if (!compositeEventBlockMap[key]) {
                  compositeEventBlockMap[key] = NULL_COMPOSITE_EVENT_BLOCK;
                }

                const bech32OperatorAddress = eachMessage.value.validatorAddress ? convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix) : '';

                if (
                  [
                    '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
                    '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
                  ].includes(eachMessage.typeUrl)
                ) {
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
                    'slash'
                  ].includes(eachMessage.typeUrl)
                ) {

                  const stakeAmount = parseInt(eachMessage.value.amount.amount);
                  const additiveTxs = ['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation'];

                  compositeEventBlockMap[key].total_stake += additiveTxs.includes(eachMessage.typeUrl) ? stakeAmount : -stakeAmount;
                  if (bech32OperatorAddress == eachMessage.value.delegatorAddress) compositeEventBlockMap[key].self_stake += additiveTxs.includes(eachMessage.typeUrl) ? stakeAmount : -stakeAmount;
                } else if (
                  ['/cosmos.staking.v1beta1.MsgBeginRedelegate'].includes(eachMessage.typeUrl)
                ) {

                  const bech32SrcOperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorSrcAddress, chain.denom);

                  const value = parseInt(eachMessage.value.amount.amount);

                  if (!compositeEventBlockMap[eachMessage.value.validatorSrcAddress]) 
                    compositeEventBlockMap[eachMessage.value.validatorSrcAddress] = NULL_COMPOSITE_EVENT_BLOCK;
                  compositeEventBlockMap[eachMessage.value.validatorSrcAddress].operator_address = eachMessage.value.validatorSrcAddress;
                  compositeEventBlockMap[eachMessage.value.validatorSrcAddress].total_stake += (value * -1);
                  if (bech32SrcOperatorAddress == eachMessage.value.delegatorAddress)
                    compositeEventBlockMap[eachMessage.value.validatorSrcAddress].self_stake += (value * -1);

                  if (!compositeEventBlockMap[eachMessage.value.validatorDstAddress]) 
                    compositeEventBlockMap[eachMessage.value.validatorDstAddress] = NULL_COMPOSITE_EVENT_BLOCK;
                  compositeEventBlockMap[eachMessage.value.validatorDstAddress].operator_address = eachMessage.value.validatorDstAddress;
                  compositeEventBlockMap[eachMessage.value.validatorDstAddress].total_stake += value;
                }
              }
              resolve();
            })
        )
      );
    
    Promise.allSettled(promises)
      .then(values => {
        values.forEach(eachValue => (eachValue.status == 'rejected') ? console.log(eachValue) : '');
        Validator.saveManyValidators(validatorMap, (err, validators) => {
          if (err) return final_callback(err, false);

          CompositeEventBlock.saveManyCompositeEventBlocks(compositeEventBlockMap, (err, compositeEventBlocks) => {
            if (err) return final_callback(err, false);
            const insertedValidatorAddresses = validators?.insertedValidators ? validators?.insertedValidators.map(validator => validator.operator_address) : [];
            const updatedValidatorAddresses = validators?.updatedValidators ? validators?.updatedValidators.map(validator => validator.operator_address) : [];
            const savedCompositeEventBlocks = compositeEventBlocks?.map(each => each.block_height);
            
            (validators?.insertedValidators && validators?.insertedValidators.length > 0) ? console.log(`Validator | CREATED | ${insertedValidatorAddresses.length <= 0 ? 'NONE' : insertedValidatorAddresses}`) : '';
            (savedCompositeEventBlocks && savedCompositeEventBlocks.length > 0) ? console.log(`CompositeEventBlock | CREATED | ${savedCompositeEventBlocks.length <= 0 ? 'NONE' : savedCompositeEventBlocks}`) : '';
            console.log('\n')
            const timestamp = (compositeEventBlocks && compositeEventBlocks[0]) ? new Date(compositeEventBlocks[0].timestamp) : undefined;
            const blockTimestamp = timestamp ? new Date(timestamp).getTime() : '';
            Validator.updateLastVisitedBlock({ chain_identifier, block_height: bottom_block_height, block_time: timestamp }, (err, updated_chain) => {
              if (!blockTimestamp || blockTimestamp - chain.active_set_last_updated_block_time <= 86400000)
              return final_callback(null, true);

            Validator
              .updateActiveValidatorList({
                chain_identifier: chain_identifier,
                chain_rpc_url: chain.rpc_url,
                height: bottom_block_height,
                day: new Date(blockTimestamp).getDay(),
                month: new Date(blockTimestamp).getMonth() + 1,
                year: new Date(blockTimestamp).getFullYear(),
              }, (err, savedActiveValidators) => {
                if (err) return final_callback(null, false);
                Chain.updateTimeOfLastActiveSetSave({ chain_identifier: chain_identifier, time: blockTimestamp }, (err, chain) => {
                  console.log(`Active validators updated for ${savedActiveValidators?.active_validators.length}/${savedActiveValidators?.month}/${savedActiveValidators?.year}`)
                  return final_callback(null, true);
                })
              })
            })
        })
      })
    })
  });
};
