
import { decodeTxRaw, Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from './getSpecificAttributeOfAnEventFromTxEventsArray.js';
import { LISTENING_EVENTS } from '../listeners/listenForEvents.js';

export interface EventAttribute { 
  key: string; 
  value: string; 
  index: boolean 
};
export interface Event { 
  type: string, 
  attributes: EventAttribute[] 
};

export interface DecodedMessage {
  time: Date;
  typeUrl: string;
  value: any;
}

interface DecodedTx {
  messages: DecodedMessage[];
}

const WITHDRAW_EVENTS = [
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission'
];

const registry = new Registry(defaultRegistryTypes);



const decodeTransactions = (txs: string[], events: Event[][], denom: string, time: Date) => {

  const decodedTxs = [];
  
  for (let i = 0; i < txs.length; i++) {
    const base64tx = txs[i];

    const messages = [];

    let tx;
    try { tx = decodeTxRaw(Buffer.from(base64tx, 'base64')); }
    catch (err) { continue; }
      
    const filteredMessages = tx.body.messages.filter((message) => LISTENING_EVENTS.includes(message.typeUrl));
    
    for (let j = 0; j < filteredMessages.length; j++) {
      const message = filteredMessages[j];
      
      if (!WITHDRAW_EVENTS.includes(message.typeUrl)) {
        messages.push({ time: time, typeUrl: message.typeUrl, value: registry.decode(message) });
        continue;
      }
      
      const nativeRewardOrCommissionValue = getSpecificAttributeOfAnEventFromTxEventsArray(events[i], ['withdraw_rewards', 'withdraw_commission'], 'amount', denom);
      if (!nativeRewardOrCommissionValue) continue;
      
      const decodedMessage = registry.decode(message);
      decodedMessage.amount = { denom: denom, amount: nativeRewardOrCommissionValue };
      messages.push({ time: time, typeUrl: message.typeUrl, value: decodedMessage });
    }
    
    decodedTxs.push({ messages });
  }
  
  const filteredTxs = decodedTxs.filter((tx) => tx.messages.length > 0);
  return filteredTxs;
};

export default decodeTransactions;
