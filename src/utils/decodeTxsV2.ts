
import { decodeTxRaw, Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from './getSpecificAttributeOfAnEventFromTxEventsArray.js';
import { getOnlyNativeTokenValueFromAmountString } from '../listeners/functions/getOnlyNativeTokenValueFromAmountString.js';

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
  time: Date | null;
  typeUrl: string;
  value: any;
}

interface RpcContext {
  rpc_url: string,
  block_height: number,
}

interface DecodedTx {
  messages: DecodedMessage[];
}

const LISTENING_EVENTS = [
  'create_validator',
  'delegate',
  'withdraw_rewards',
  'withdraw_commission'
];

const registry = new Registry(defaultRegistryTypes);

const getAttributesAsMapping = (
  attributes: {
    key: string,
    value: string,
    index: boolean
  }[]
) => {
  const attributesMapping: Record<string, string> = {};
  for (let i = 0; i < attributes.length; i++) {
    const eachAttribute = attributes[i];
    attributesMapping[eachAttribute.key] = eachAttribute.value;
  }
  return attributesMapping;
}

const getAttributesAsMappingFromEventType = (
  events: Event[],
  searchType: string,
  attributeEqualityPattern: string
) => {
  for (let i = 0; i < events.length; i++) {
    const eachEvent = events[i];
    if (eachEvent.type != searchType) continue;
    const attributes = getAttributesAsMapping(eachEvent.attributes);

    let flag = 1;
    attributeEqualityPattern.split(',').forEach(eachEquationGeneralPattern => {
      const [key, value] = eachEquationGeneralPattern.split(':');
      if (value != 'true')
        if (attributes[key] != value) return flag = 0;
      else
        if (!attributes[key]) return flag = 0;
    })
    if (!flag) continue;
    return { attributes, index: i };
  }
  return { attributes: null, index: -1 };
}

const decodeTxsV2 = (
  ctx: RpcContext,
  events: Event[][],
  denom: string,
  time: Date | null,
  callback: (
    err: string | null,
    decodedTxs: DecodedTx[]
  ) => any
) => {

  let createValidatorPromises = [];
  const decodedTxs = [];
  
  for (let i = 0; i < events.length; i++) {
    const eachTransactionEvents = events[i];

    const messages = [];

    for (let j = 0; j < eachTransactionEvents.length; j++) {
      const eachEvent = eachTransactionEvents[j];
      if (!LISTENING_EVENTS.includes(eachEvent.type)) continue;

      let value: Record<string, any> = {};

      const attributesMapping = getAttributesAsMapping(eachEvent.attributes);
      
      if (!['create_validator', 'complete_redelegation'].includes(eachEvent.type)) {
        value = {
          validatorAddress: attributesMapping.validator || null,
          delegatorAddress: attributesMapping.delegator || null,
          value: {
            amount: getOnlyNativeTokenValueFromAmountString(attributesMapping.amount, denom),
            denom: denom
          },
        }
        
        if (
          value.delegatorAddress || 
          (
            eachEvent.type == 'withdraw_commission' &&
            value.validatorAddress
          )
        ) {
          messages.push({ time: time, typeUrl: eachEvent.type, value: value });
          continue;
        }
      }

      if (eachEvent.type == 'delegate') {

        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message', 'module:staking,sender:true');
        if (!attributes) throw new Error('delegate:delegator_not_found');
        eachTransactionEvents[index].type = 'message_used';
        value.delegatorAddress = attributes.sender;
      } else if (eachEvent.type == 'create_validator') {
        const { rpc_url, block_height } = ctx;
        createValidatorPromises.push(
          new Promise(
            (
              resolve: (message: DecodedMessage) => any,
              reject: (err: string) => any
            ) => {
              fetch(`http://${rpc_url}/block?height=${block_height}`, { signal: AbortSignal.timeout(15 * 1000) })
                .then((response: any) => response.json())
                .then(response => {
                  const transactions = response.result.block.data.txs;
                  const createValidatorTransactionBase64 = transactions[i];

                  let createValidatorTx;
                  try { createValidatorTx = decodeTxRaw(Buffer.from(createValidatorTransactionBase64, 'base64')); }
                  catch (err) { reject('create_validator:tx_decode_error'); }

                  createValidatorTx?.body.messages.forEach(eachMessage => {
                    if (eachMessage.typeUrl == '/cosmos.staking.v1beta1.MsgCreateValidator')
                      return resolve({ time: time, typeUrl: eachMessage.typeUrl, value: registry.decode(eachMessage) });
                  })
                })
            }
          )
        )

      } else if (eachEvent.type == 'withdraw_rewards') {

        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message', 'module:staking,sender:true');
        if (!attributes) throw new Error('withdraw_rewards:delegator_not_found');
        eachTransactionEvents[index].type = 'message_used';
        value.delegatorAddress = attributes.sender;

      } else if (eachEvent.type == 'withdraw_commission') {

        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message', 'module:staking,sender:true');
        if (!attributes) throw new Error('withdraw_commission:validator_not_found');
        eachTransactionEvents[index].type = 'message_used';
        value.validatorAddress = attributes.sender;

      } else {
        continue;
      }

      messages.push({ time: time, typeUrl: 'each', value: value });
    }
    
    decodedTxs.push({ messages });
  }
  
  if (!createValidatorPromises.length) {
    const filteredTxs = decodedTxs.filter((tx) => tx.messages.length > 0);
    return callback(null, filteredTxs);
  } else {
    const messagesFromCreateValidator: DecodedMessage[] = [];
    
    Promise.allSettled(createValidatorPromises)
      .then(results => {
        results.forEach((eachResult, i) => {
          if (eachResult.status != 'fulfilled')
            return callback(`bad_request:create_validator:promise:${i}`, []);
          messagesFromCreateValidator.push(eachResult.value);
        });

        decodedTxs.push({ messagesFromCreateValidator });
      })
    
    const filteredTxs = decodedTxs.filter((tx) => tx.messages.length > 0);
    return callback(null, filteredTxs);
  }
};

export default decodeTxsV2;
