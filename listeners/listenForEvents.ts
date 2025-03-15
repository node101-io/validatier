import async from 'async';
import axios from 'axios';
import WebSocket from 'ws';

import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import StakeRecordEvent from '../models/StakeRecord/StakeRecord.js';
import WithdrawRecordEvent from '../models/WithdrawRecord/WithdrawRecord.js';

import { convertOperatorAddressToBech32 } from '../utils/convertOperatorAddressToBech32.js';
import { getOnlyNativeTokenValueFromCommissionOrRewardEvent } from './functions/getOnlyNativeTokenValueFromCommissionOrRewardEvent.js';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from '../utils/getSpecificAttributeOfAnEventFromTxEventsArray.js';

import { CosmosTx } from './interfaces/apiTxResultInterface.js';
import Chain from '../models/Chain/Chain.js';

const RESTART_WAIT_INTERVAL = 5 * 1000;
const WEBSOCKET_URLS = [
  {url: 'wss://g.w.lavanet.xyz:443/gateway/celestia/tendermint-rpc/14f76aeb7eb005d23cba691b5c355d4d', chain_identifier: 'celestia'},
  // {url: 'wss://cosmoshub.tendermintrpc.lava.build/websocket', chain_identifier: 'cosmoshub'}
];
const LISTENING_EVENTS = [
  '/cosmos.staking.v1beta1.MsgDelegate',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'
];

function getTransactionInfo(txHash: string, chain_identifier: string, callback: (err: string | null, data: CosmosTx | null) => any) {
  
  const TENDERMINT_RPC_URL = `https://rest.cosmos.directory/${chain_identifier}/cosmos/tx/v1beta1/txs/`;

  axios
    .get(`${TENDERMINT_RPC_URL}/${txHash}`)
    .then((response: { data: CosmosTx }) => callback(null, response.data))
    .catch((err) => callback('bad_request', null));
}

const listenEventsForUrl = (url: string, chain_identifier: string, denom: string) => {
  const ws = new WebSocket(url);

  ws.on('open', () => {    
    console.log(`Listening to chain ${chain_identifier.toUpperCase()} | Connected to WebSocket: ${url}`);

    const subscribeMsg = {
      jsonrpc: '2.0',
      id: 1,
      method: 'subscribe',
      params: {
        query: 'tm.event=\'Tx\''
      }
    };
    ws.send(JSON.stringify(subscribeMsg));
    console.log(`Subscribed to events on ${url}: \n - MsgDelegate \n - MsgWithdrawDelegatorRewards \n - MsgWithdrawValidatorCommission`);
  });

  ws.on('message', async (data) => {
    
    const dataJson = JSON.parse(data.toString());
    if (!dataJson || !dataJson.result || !dataJson.result.events) return;
    const events = dataJson.result.events;

    if (!events || !events['tx.hash'] || !events['tx.hash'][0] || !events['tx.height'] || !events['tx.height'][0]) return;

    const blockHeight = events['tx.height'][0];
    const txHash = events['tx.hash'][0];

    getTransactionInfo(txHash, chain_identifier, (err, txRawResult) => {
      
      if (err || !txRawResult || !txRawResult.tx || !txRawResult.tx.body || !txRawResult.tx_response) return;
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

          convertOperatorAddressToBech32(validatorAddress, (err, bech32ValidatorAddress) => {
            if (err) return console.log(err);

            if (messageType == '/cosmos.staking.v1beta1.MsgDelegate'/* && delegatorAddress == bech32ValidatorAddress*/) {

              const amountAttribute = eachMessage['amount'];

              if (!amountAttribute) return next();

              const amount = amountAttribute['amount'];

              if (!denom || !amount) return next();

              StakeRecordEvent.saveStakeRecordEvent({
                operator_address: validatorAddress,
                denom: denom,
                amount: amount,
                txHash: txHash
              }, (err, newStakeRecordEvent) => {
                if (err || !newStakeRecordEvent || typeof parseInt(blockHeight) != 'number' || typeof parseFloat(amount) != 'number') return console.log('bad_request | ' + new Date());

                CompositeEventBlock.saveCompositeEventBlock({
                  block_height: parseInt(blockHeight),
                  operator_address: validatorAddress,
                  denom: denom,
                  self_stake: parseFloat(amount)
                }, (err, newCompositeEventBlock) => {
                  if (err || !newCompositeEventBlock) return console.log(err + ' | ' + new Date());

                  console.log('Stake event saved for validator: ' + newStakeRecordEvent.operator_address + ' | Composite block saved with block_height: ' + newCompositeEventBlock.block_height + ' | ' + new Date());
                  return next();
                });
              });
            } else if (messageType == '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission') {

              getSpecificAttributeOfAnEventFromTxEventsArray(txRawResult.tx_response.events, 'withdraw_commission', 'amount', (err, specificAttributeValue) => {
                if (err || !specificAttributeValue) return console.log(err + ' | ' + new Date());
                getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, denom, (err, nativeRewardOrCommissionValue) => {
                  if (err || !nativeRewardOrCommissionValue) return console.log(err + ' | ' + new Date());
                  WithdrawRecordEvent.saveWithdrawRecordEvent({
                    operator_address: validatorAddress,
                    withdrawType: 'commission',
                    denom: denom,
                    amount: nativeRewardOrCommissionValue,
                    txHash: txHash
                  }, (err, newWithdrawRecordEvent) => {
                    if (err || !newWithdrawRecordEvent) return console.log(err + ' | ' + new Date());
                    CompositeEventBlock.saveCompositeEventBlock({
                      block_height: parseInt(blockHeight),
                      operator_address: validatorAddress,
                      denom: denom,
                      reward: parseInt(nativeRewardOrCommissionValue),
                    }, (err, newCompositeEventBlock) => {
                      if (err || !newCompositeEventBlock) return console.log(err + ' | ' + new Date());

                      console.log('Commission withdraw saved for validator: ' + newWithdrawRecordEvent.operator_address + ' | Composite block saved with block_height: ' + newCompositeEventBlock.block_height + ' | ' + new Date());
                      return next();
                    });
                  });
                });
              });
            } else if (messageType == '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward'/* && delegatorAddress == bech32ValidatorAddress */) {
              
              getSpecificAttributeOfAnEventFromTxEventsArray(txRawResult.tx_response.events, 'withdraw_rewards', 'amount', (err, specificAttributeValue) => {
                if (err || !specificAttributeValue) return console.log(err + ' | ' + new Date());
                getOnlyNativeTokenValueFromCommissionOrRewardEvent(specificAttributeValue, denom, (err, nativeRewardOrCommissionValue) => {
                  if (err || !nativeRewardOrCommissionValue) return console.log(err + ' | ' + new Date());
                  WithdrawRecordEvent.saveWithdrawRecordEvent({
                    operator_address: validatorAddress,
                    withdrawType: 'reward',
                    denom: denom,
                    amount: nativeRewardOrCommissionValue,
                    txHash: txHash
                  }, (err, newWithdrawRecordEvent) => {
                    if (err || !newWithdrawRecordEvent) return console.log(err + ' | ' + new Date());
                    CompositeEventBlock.saveCompositeEventBlock({
                      block_height: parseInt(blockHeight),
                      operator_address: validatorAddress,
                      denom: denom,
                      reward: parseInt(nativeRewardOrCommissionValue)
                    }, (err, newCompositeEventBlock) => {
                      if (err || !newCompositeEventBlock) return console.log(err + ' | ' + new Date());

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
    console.warn(`WebSocket closed for ${url}. Reconnecting...`);
    setTimeout(() => listenEventsForUrl(url, chain_identifier, denom), RESTART_WAIT_INTERVAL);
  });
};

export const listenEvents = () => {

  Chain
    .find({})
    .then(chains => {
      chains.forEach(eachChain => {
        listenEventsForUrl(eachChain.wss_url, eachChain.name, eachChain.denom);
      })
    })
};
