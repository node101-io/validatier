import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import Validator from '../models/Validator/Validator.js';
import Chain from '../models/Chain/Chain.js';
import getTxsByHeight from '../utils/getTxsByHeight.js';
import { DecodedMessage } from '../utils/decodeTxs.js';
import { convertOperatorAddressToBech32 } from '../utils/convertOperatorAddressToBech32.js';

const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgCreateValidator',
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.staking.v1beta1.MsgEditValidator',
  '/cosmos.staking.v1beta1.MsgUndelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
];

export const listenForEvents = async (
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
    for (let height = bottom_block_height; height < top_block_height; height++) {
      promises.push(
        new Promise ((resolve, reject) => {
          getTxsByHeight(chain.rpc_url, height, chain.denom, chain.bech32_prefix, (err, decodedTxs) => {
            
            if (err) reject(err);
            if (!decodedTxs) resolve();
            const flattenedDecodedTxs: DecodedMessage[] = decodedTxs.flatMap((obj: { messages: DecodedMessage }) => obj.messages);
            if (!flattenedDecodedTxs.length) resolve();
            for (const eachMessage of flattenedDecodedTxs) {
              if (!LISTENING_EVENTS.includes(eachMessage.typeUrl)) continue;
              const key = eachMessage.value.validatorAddress;

              if (['/cosmos.staking.v1beta1.MsgCreateValidator', '/cosmos.staking.v1beta1.MsgEditValidator'].includes(eachMessage.typeUrl)) {
                
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
                  if (!compositeEventBlockMap[key]) compositeEventBlockMap[key] = { block_height: height, operator_address: key, denom: chain.denom, self_stake: 0, reward: 0, total_stake: 0, total_withdraw: 0, timestamp: new Date(eachMessage.time).getTime() };
                  compositeEventBlockMap[key].self_stake += eachMessage.value.value.amount;
                  compositeEventBlockMap[key].total_stake += eachMessage.value.value.amount;
                }
                continue;
              } 

              if (!compositeEventBlockMap[key]) compositeEventBlockMap[key] = { block_height: height, operator_address: key, denom: chain.denom, self_stake: 0, reward: 0, total_stake: 0, total_withdraw: 0, timestamp: new Date(eachMessage.time).getTime() };
              const bech32OperatorAddress = convertOperatorAddressToBech32(eachMessage.value.validatorAddress, chain.bech32_prefix);

              if (['/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'].includes(eachMessage.typeUrl)) {
                
                compositeEventBlockMap[key].reward += parseInt(eachMessage.value.amount.amount);
                if (bech32OperatorAddress == eachMessage.value.delegatorAddress) compositeEventBlockMap[key].reward += parseInt(eachMessage.value.amount.amount);
              
              } else if (['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgUndelegate'].includes(eachMessage.typeUrl)) {

                const stakeAmount = parseInt(eachMessage.value.amount.amount);

                compositeEventBlockMap[key].self_stake += eachMessage.typeUrl === '/cosmos.staking.v1beta1.MsgDelegate' ? stakeAmount : -stakeAmount;
                if (bech32OperatorAddress == eachMessage.value.delegatorAddress) compositeEventBlockMap[key].self_stake += eachMessage.typeUrl === '/cosmos.staking.v1beta1.MsgDelegate' ? stakeAmount : -stakeAmount;
              }
            }
            resolve();
          });
        })
      );
    }
    
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
            
            validators?.insertedValidators ? console.log(`Validator | CREATED | ${insertedValidatorAddresses.length <= 0 ? 'NONE' : insertedValidatorAddresses}`) : '';
            validators?.updatedValidators ? console.log(`Validator | SAVED | ${updatedValidatorAddresses.length <= 0 ? 'NONE' : insertedValidatorAddresses}`) : '';
            savedCompositeEventBlocks ? console.log(`CompositeEventBlock | CREATED | ${savedCompositeEventBlocks.length <= 0 ? 'NONE' : savedCompositeEventBlocks}`) : '';
        
            const timestamp = (compositeEventBlocks && compositeEventBlocks[0]) ? new Date(compositeEventBlocks[0].timestamp) : undefined;
            Validator.updateLastVisitedBlock({ chain_identifier: chain_identifier, block_height: top_block_height, block_time: timestamp }, (err, chain) => {
              if (err) return final_callback(err, false);
              return final_callback(null, true);
            })
          })
        })
      })
    })
  
};
