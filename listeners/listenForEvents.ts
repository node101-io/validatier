import async from 'async';
import axios from 'axios';
import WebSocket from 'ws';

import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import StakeRecordEvent from '../models/StakeRecord/StakeRecord.js';
import WithdrawRecordEvent from '../models/WithdrawRecord/WithdrawRecord.js';

import { convertOperationAddressToBech32 } from '../utils/convertOperationAddressToBech32.js';
import { getOnlyNativeTokenValueFromCommissionOrRewardEvent } from './functions/getOnlyNativeTokenValueFromCommissionOrRewardEvent.js';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from '../utils/getSpecificAttributeOfAnEventFromTxEventsArray.js';

import { CosmosTx } from './interfaces/apiTxResultInterface.js';

const TENDERMINT_RPC_URL = 'https://rest.cosmos.directory/cosmoshub/cosmos/tx/v1beta1/txs/';
const WEBSOCKET_URL = 'wss://cosmoshub.tendermintrpc.lava.build/websocket';
const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'
]

function getTransactionInfo(txHash: string, callback: (err: string | null, data: CosmosTx | null) => any) {
  axios
    .get(`${TENDERMINT_RPC_URL}/${txHash}`)
    .then((response: { data: CosmosTx }) => callback(null, response.data))
    .catch((err) => callback('bad_request', null));
}

export const listenEvents = () => {
  const ws = new WebSocket(WEBSOCKET_URL);

  ws.on('open', () => {
    console.log('Connected to WebSocket!');

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'subscribe',
      params: {
        query: 'tm.event=\'Tx\''
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
    console.log('Subscribed to events:\n - MsgDelegate \n - MsgWithdrawDelegatorRewards \n - MsgWithdrawValidatorCommission');
  });

  ws.on('message', async (data) => {
    const events = JSON.parse(data.toString()).result.events;
    if (!events || !events['message.module'] || !events['message.action'] || !events['tx.hash'] || !events['tx.hash'][0] || !events['tx.height'] || !events['tx.height'][0]) return;

    const blockHeight = events['tx.height'][0];
    const txHash = events['tx.hash'][0];

    getTransactionInfo(txHash, (err, txRawResult) => {
      if (err || !txRawResult || !txRawResult.tx || !txRawResult.tx.body || txRawResult.tx_response) return;

      const txResult = txRawResult.tx.body;
      
      if (!txResult || !txResult.messages) return;

      async.timesSeries(
        txResult.messages.length, 
        (i, next) => {
          const eachMessage = txResult.messages[i];

          const messageType = eachMessage['@type'];
          const validatorAddress = eachMessage['validator_address'];
          const delegatorAddress = eachMessage['delegator_address'];

          if (!validatorAddress || !delegatorAddress || !LISTENING_EVENTS.includes(messageType)) return next();

          convertOperationAddressToBech32(validatorAddress, (err, bech32ValidatorAddress) => {
            if (err) return console.log(err);

            if (messageType == '/cosmos.staking.v1beta1.MsgDelegate' && delegatorAddress == bech32ValidatorAddress) {

              const amountAttribute = eachMessage['amount'];

              if (!amountAttribute) return next();

              const denom = amountAttribute['denom'];
              const amount = amountAttribute['amount'];

              if (!denom || !amount) return next();

              StakeRecordEvent.saveStakeRecordEvent({
                operator_address: validatorAddress,
                denom: denom,
                amount: amount,
                txHash: txHash
              }, (err, newStakeRecordEvent) => {
                if (err || typeof parseInt(blockHeight) != 'number' || typeof parseFloat(amount) != 'number') return console.log('bad_request | ' + new Date());

                CompositeEventBlock.saveCompositeEventBlock({
                  block_height: parseInt(blockHeight),
                  operator_address: validatorAddress,
                  denom: 'uatom',
                  self_stake: parseFloat(amount)
                }, (err, newCompositeEventBlock) => {
                  if (err) return console.log(err + ' | ' + new Date());

                  console.log('Stake event saved for validator: ' + newStakeRecordEvent.operator_address + ' | Composite block saved with block_height: ' + newCompositeEventBlock.block_height + ' | ' + new Date());
                  return next();
                });
              });
            } else if (messageType == '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission') {

              getSpecificAttributeOfAnEventFromTxEventsArray(txRawResult.tx_response.events, 'withdraw_commission', 'amount', (err, specificAttributeValue) => {
                if (err || !specificAttributeValue) return console.log(err + ' | ' + new Date());
                getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, (err, nativeRewardOrCommissionValue) => {
                  if (err || !nativeRewardOrCommissionValue) return console.log(err + ' | ' + new Date());
                  WithdrawRecordEvent.saveWithdrawRecordEvent({
                    operator_address: validatorAddress,
                    withdrawType: 'commission',
                    denom: 'uatom',
                    amount: nativeRewardOrCommissionValue,
                    txHash: txHash
                  }, (err, newWithdrawRecordEvent) => {
                    if (err) return console.log(err + ' | ' + new Date());
                    CompositeEventBlock.saveCompositeEventBlock({
                      block_height: parseInt(blockHeight),
                      operator_address: validatorAddress,
                      denom: 'uatom',
                      reward: parseInt(nativeRewardOrCommissionValue)
                    }, (err, newCompositeEventBlock) => {
                      if (err) return console.log(err + ' | ' + new Date());
    
                      console.log('Commission withdraw saved for validator: ' + newWithdrawRecordEvent.operator_address + ' | Composite block saved with block_height: ' + newCompositeEventBlock.block_height + ' | ' + new Date());
                      return next();
                    });
                  });
                });
              });
            } else if (messageType == '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward' && delegatorAddress == bech32ValidatorAddress) {
              getSpecificAttributeOfAnEventFromTxEventsArray(txRawResult.tx_response.events, 'withdraw_rewards', 'amount', (err, specificAttributeValue) => {
                if (err || !specificAttributeValue) return console.log(err + ' | ' + new Date());
                getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, (err, nativeRewardOrCommissionValue) => {
                  if (err || !nativeRewardOrCommissionValue) return console.log(err + ' | ' + new Date());
                  WithdrawRecordEvent.saveWithdrawRecordEvent({
                    operator_address: validatorAddress,
                    withdrawType: 'reward',
                    denom: 'uatom',
                    amount: nativeRewardOrCommissionValue,
                    txHash: txHash
                  }, (err, newWithdrawRecordEvent) => {
                    if (err || !newWithdrawRecordEvent) return console.log(err + ' | ' + new Date());
                    CompositeEventBlock.saveCompositeEventBlock({
                      block_height: parseInt(blockHeight),
                      operator_address: validatorAddress,
                      denom: 'uatom',
                      reward: parseInt(nativeRewardOrCommissionValue)
                    }, (err, newCompositeEventBlock) => {
                      if (err) return console.log(err + ' | ' + new Date());
    
                      console.log('Reward withdraw saved for validator: ' + newWithdrawRecordEvent.operator_address + ' | Composite block saved with block_height: ' + newCompositeEventBlock.block_height + ' | ' + new Date());
                      return next();
                    });
                  });
                });
              });
            } else return;
          });
        }, 
        (err) => {
          if (err) return console.log(err);
          return;
        }
      );
    });
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  ws.on('close', () => {
    console.warn('WebSocket closed. Reconnecting...');
    setTimeout(listenEvents, 5000);
  });
};
