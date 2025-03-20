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

const ACTIVE_VALIDATOR_SET_CHECK_FREQUENCY = 3000;

export const listenForEvents = async (
  bottom_block_height: number,
  top_block_height: number,
  chain_identifier: string,
  final_callback: (err: string | null, success: Boolean) => any
) => {
  try {
    const chain = await Chain.findOne({ name: chain_identifier });
    if (!chain) throw new Error('not_found');

    const denom = chain.denom;

    const promises: Promise<void>[] = [];

    for (let height = bottom_block_height; height < top_block_height; height++) {

      promises.push(
        (async () => {
          try {
            const decodedTxs = await getTxsByHeight(chain.rpc_url, height, denom, chain.bech32_prefix);
            if (!decodedTxs) return;

            const flattenedDecodedTxs: DecodedMessage[] = decodedTxs.flatMap((obj: { messages: DecodedMessage }) => obj.messages);
            if (!flattenedDecodedTxs.length) return;
            
            const blockTime = flattenedDecodedTxs[0].time;

            if (height % ACTIVE_VALIDATOR_SET_CHECK_FREQUENCY == 0) await Validator.updateActiveValidatorList({
              chain_identifier: chain.name, 
              chain_rpc_url: chain.rpc_url, 
              height: height, 
              block_time: new Date(blockTime)
            });

            const validatorMap: Record<string, any> = {};
            const rewardMap: Record<string, any> = {};
            const stakeMap: Record<string, any> = {};

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
              } 
              else if (['/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'].includes(eachMessage.typeUrl)) {
                if (!rewardMap[key]) rewardMap[key] = { block_height: height, operator_address: key, denom, reward: 0, timestamp: new Date(eachMessage.time).getTime() };
                rewardMap[key].reward += parseInt(eachMessage.value.amount.amount);
              } else if (
                ['/cosmos.staking.v1beta1.MsgDelegate', '/cosmos.staking.v1beta1.MsgUndelegate'].includes(eachMessage.typeUrl)
              ) {
                if (!stakeMap[key]) stakeMap[key] = { block_height: height, operator_address: key, denom, self_stake: 0, timestamp: new Date(eachMessage.time).getTime() };

                const stakeAmount = parseInt(eachMessage.value.amount.amount);
                stakeMap[key].self_stake += eachMessage.typeUrl === '/cosmos.staking.v1beta1.MsgDelegate' ? stakeAmount : -stakeAmount;
              }
            }

            for (const key in validatorMap) {
              await new Promise<void>((resolve, reject) => {
                Validator.saveValidator(validatorMap[key], (err, validator) => {
                  if (err) return reject(err);
                  console.log(`VALIDATOR | SAVED | ${validator?.operator_address}`);
                  resolve();
                });
              });
            }

            for (const key in rewardMap) {
              await new Promise<void>((resolve, reject) => {
                CompositeEventBlock.saveCompositeEventBlock(rewardMap[key], (err, newCompositeEventBlock) => {
                  if (err) return reject(err);
                  console.log(`REWARD | SAVED | ${newCompositeEventBlock?.operator_address}`);
                  resolve();
                });
              });
            }

            for (const key in stakeMap) {
              await new Promise<void>((resolve, reject) => {
                CompositeEventBlock.saveCompositeEventBlock(stakeMap[key], (err, newCompositeEventBlock) => {
                  if (err) return reject(err);
                  console.log(`STAKE | SAVED | ${newCompositeEventBlock?.operator_address}`);
                  resolve();
                });
              });
            }
          } catch (err) {
            throw new Error(`Error processing block ${height}: ${err}`);
          }
        })()
      );
    }

    await Promise.all(promises);
    return final_callback(null, true);
  } catch (error) {
    return final_callback('bad_request', false);
  }
};
