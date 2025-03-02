import async from 'async';
import axios from 'axios';
import WebSocket from 'ws';

import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import StakeRecordEvent from '../models/StakeRecord/StakeRecord.js';
import WithdrawRecordEvent from '../models/WithdrawRecord/WithdrawRecord.js';

import { convertOperationAddressToBech32 } from './convertOperationAddressToBech32.js';
import { getOnlyNativeTokenValueFromCommissionOrRewardEvent } from './getRewardOrCommissionArraysFromEvent.js';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from './getSpecificAttributeOfAnEventFromTxEventsArray.js';

const MINIMAL_SEPERATOR = '--';
const TENDERMINT_RPC_URL = 'https://rest.cosmos.directory/cosmoshub/cosmos/tx/v1beta1/txs/';
const WEBSOCKET_URL = 'wss://cosmoshub.tendermintrpc.lava.build/websocket';
const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'
]

interface GetTransactionInfoInterface {
  tx: {
    body: any,
    auth: any,
    signatures: string[]
  },
  tx_response: any
}

function getTransactionInfo(txHash: string, callback: (err: string, data: {tx: any, tx_response: any} | null) => any) {
  axios.get(`${TENDERMINT_RPC_URL}/${txHash}`)
    .then(response => {
      const data: GetTransactionInfoInterface = response.data;
      return callback('', data);
    }).catch((err) => callback(err, null));
}

export const listenEvents = () => {
  const ws = new WebSocket(WEBSOCKET_URL);

  ws.on('open', () => {
    console.log('✅ Connected to WebSocket!');

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'subscribe',
      params: {
        query: 'tm.event=\'Tx\''
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
    console.log('📩 Subscribed to events:\n - MsgDelegate \n - MsgWithdrawDelegatorRewards \n - MsgWithdrawValidatorCommission');
  });

  ws.on('message', async (data) => {
    const events = JSON.parse(data.toString()).result.events;
    if (!events || !events['message.module'] || !events['message.action'] || !events['tx.hash'] || !events['tx.hash'][0] || !events['tx.height'] || !events['tx.height'][0]) return;

    const blockHeight = events['tx.height'][0];
    const txHash = events['tx.hash'][0];

    getTransactionInfo(txHash, (err, txRawResult) => {
      if (err || !txRawResult) return;

      const txResult = txRawResult.tx.body;
      
      if (!txResult || !txResult.messages) return;

      async.timesSeries(
        txResult.messages.length, 
        (i, next) => {
          const eachMessage = txResult.messages[i];
          if (!eachMessage['validator_address'] || !LISTENING_EVENTS.includes(eachMessage['@type'])) return next();

          convertOperationAddressToBech32(eachMessage['validator_address'], (err, bech32ValidatorAddress) => {
            if (err) return console.log(err);

            if (eachMessage['@type'] == '/cosmos.staking.v1beta1.MsgDelegate') {
              StakeRecordEvent.saveStakeRecordEvent({
                operator_address: eachMessage['validator_address'],
                denom: eachMessage['amount']['denom'],
                amount: eachMessage['amount']['amount'],
                txHash: txHash
              }, (err, newStakeRecordEvent) => {
                if (err || typeof parseInt(blockHeight) != 'number' || typeof parseFloat(eachMessage['amount']['amount']) != 'number') return console.log('bad_request | ' + new Date());

                CompositeEventBlock.saveCompositeEventBlock({
                  block_height: parseInt(blockHeight),
                  operator_address: eachMessage['validator_address'],
                  denom: 'uatom',
                  self_stake: parseFloat(eachMessage['amount']['amount'])
                }, (err, newCompositeEventBlock) => {
                  if (err) return console.log(err + ' | ' + new Date());

                  console.log('Stake event saved for validator: ' + newStakeRecordEvent.operator_address + ' | Composite block saved with block_height: ' + newCompositeEventBlock.block_height + ' | ' + new Date());
                  return next();
                });
              });
            } else if (eachMessage['@type'] == '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission') {
              getSpecificAttributeOfAnEventFromTxEventsArray(txRawResult.tx_response.events, 'withdraw_commission', 'amount', (err, specificAttributeValue) => {
                if (err || !specificAttributeValue) return console.log(err + ' | ' + new Date());
                getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, (err, nativeRewardOrCommissionValue) => {
                  if (err || !nativeRewardOrCommissionValue) return console.log(err + ' | ' + new Date());
                  WithdrawRecordEvent.saveWithdrawRecordEvent({
                    operator_address: eachMessage['validator_address'],
                    withdrawType: 'commission',
                    denom: 'uatom',
                    amount: nativeRewardOrCommissionValue,
                    txHash: txHash
                  }, (err, newWithdrawRecordEvent) => {
                    if (err) return console.log(err + ' | ' + new Date());
                    CompositeEventBlock.saveCompositeEventBlock({
                      block_height: parseInt(blockHeight),
                      operator_address: eachMessage['validator_address'],
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
            } else if (eachMessage['@type'] == '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward') {
              getSpecificAttributeOfAnEventFromTxEventsArray(txRawResult.tx_response.events, 'withdraw_rewards', 'amount', (err, specificAttributeValue) => {
                if (err || !specificAttributeValue) return console.log(err + ' | ' + new Date());
                getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, (err, nativeRewardOrCommissionValue) => {
                  if (err || !nativeRewardOrCommissionValue) return console.log(err + ' | ' + new Date());
                  WithdrawRecordEvent.saveWithdrawRecordEvent({
                    operator_address: eachMessage['validator_address'],
                    withdrawType: 'reward',
                    denom: 'uatom',
                    amount: nativeRewardOrCommissionValue,
                    txHash: txHash
                  }, (err, newWithdrawRecordEvent) => {
                    if (err || !newWithdrawRecordEvent) return console.log(err + ' | ' + new Date());
                    CompositeEventBlock.saveCompositeEventBlock({
                      block_height: parseInt(blockHeight),
                      operator_address: eachMessage['validator_address'],
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
    console.error('⚠️ WebSocket error:', err);
  });

  ws.on('close', () => {
    console.warn('❌ WebSocket closed. Reconnecting...');
    setTimeout(listenEvents, 5000);
  });
};
