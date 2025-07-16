
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
  'withdraw_commission',
  'set_withdraw_address'
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
  attributeEqualityPatterns: string[]
) => {

  let foundAttributes: Record<string, string> = { sender: '' }, foundIndex = -1, foundStatus = false;
  searchType.split('|').forEach((searchingFor, k) => {
    if (foundStatus) return;

    for (let i = 0; i < events.length; i++) {
      const eachEvent = events[i];
      if (eachEvent.type != searchingFor) continue;

      const attributeEqualityPattern = attributeEqualityPatterns[k];
      const attributes = getAttributesAsMapping(eachEvent.attributes);
      
      let flag = 1;
      let foundIn = '';
      attributeEqualityPattern.split(',').forEach(eachEquationGeneralPattern => {
        let orFlag = 0;
        eachEquationGeneralPattern.split('|').forEach(generalPatternEachOr => {
          if (orFlag) return;
          const [key, value] = generalPatternEachOr.split(':');

          if (value != 'true') {
            if (attributes[key] == value) {
              foundIn = value;
              orFlag = orFlag || 1;
            }
          }
          else {
            if (attributes[key]) {
              orFlag = orFlag || 1;
            }
          }
        })
        flag = flag && orFlag;
      })

      if (!flag) continue;
      foundStatus = true;
      foundAttributes = attributes;
      if (attributeEqualityPattern.includes('module:distribution') && foundIn == 'staking')
        foundIndex = -1
      else
        foundIndex = i
    }
  })
  return { attributes: foundAttributes, index: foundIndex };
}

const decodeTxsV2 = (
  ctx: RpcContext,
  events: Event[][],
  denom: string,
  time: Date | null,
  poppedIndices: number[],
  callback: (
    err: string | null,
    decodedTxs: DecodedTx[]
  ) => any
) => {

  let createValidatorPromises = [];
  const decodedTxs: { messages: { time: Date | null; typeUrl: string; value: Record<string, any>; }[] | DecodedMessage[]; }[] = [];
  
  for (let i = 0; i < events.length; i++) {
    const eachTransactionEvents = events[i];

    const messages = [];

    for (let j = 0; j < eachTransactionEvents.length; j++) {
      const eachEvent = eachTransactionEvents[j];
      if (!LISTENING_EVENTS.includes(eachEvent.type)) continue;

      let value: Record<string, any> = {};

      const attributesMapping = getAttributesAsMapping(eachEvent.attributes);
      
      if (!['create_validator', 'set_withdraw_address'].includes(eachEvent.type)) {
        value = {
          validatorAddress: attributesMapping.validator || null,
          delegatorAddress: attributesMapping.delegator || null,
          amount: getOnlyNativeTokenValueFromAmountString(attributesMapping.amount, denom) || '0',
        }

        if (value.amount == '0') continue;
        
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
        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message|message_used_staking|message_used', ['module:staking,sender:true', 'module:staking,sender:true', 'module:staking,sender:true']);
        if (!attributes) throw new Error('delegate:delegator_not_found');
        if (index >= 0)
          eachTransactionEvents[index].type = 'message_used_staking';
        
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
                  const successfulTxs: string[] = [];

                  response.result.block.data.txs.filter((eachTx: any, i: number) => {
                    if (!poppedIndices.includes(i))
                      successfulTxs.push(eachTx);
                  });
                  const createValidatorTransactionBase64 = successfulTxs[i];
                  
                  let createValidatorTx;
                  try { createValidatorTx = decodeTxRaw(Buffer.from(createValidatorTransactionBase64, 'base64')); }
                  catch (err) { reject('create_validator:tx_decode_error'); }
                  
                  createValidatorTx?.body.messages.forEach(eachMessage => {
                    if (eachMessage.typeUrl == '/cosmos.staking.v1beta1.MsgCreateValidator')
                      return resolve({ time: time, typeUrl: 'create_validator', value: registry.decode(eachMessage) });
                  })
                })
            }
          )
        )

      } else if (eachEvent.type == 'withdraw_rewards') {

        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message|message_used|message_used_staking|message', [
          'sender:true,module:distribution',
          'sender:true,module:distribution',
          'sender:true,module:staking',
          'sender:true|module:staking'
        ]);
        
        if (!attributes) throw new Error('withdraw_rewards:delegator_not_found');
        if (index >= 0)
          eachTransactionEvents[index].type = 'message_used';

        value.delegatorAddress = attributes.sender;

      } else if (eachEvent.type == 'withdraw_commission') {

        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message', ['sender:true,module:distribution']);
        if (!attributes) throw new Error('withdraw_commission:validator_not_found');
        if (index >= 0)
          eachTransactionEvents[index].type = 'message_used';

        value.validatorAddress = attributes.sender;

      } else if (eachEvent.type == 'set_withdraw_address') {
        value = {
          withdrawAddress: attributesMapping.withdraw_address || null,
          delegatorAddress: attributesMapping.delegator_address || null,
        }

        const { attributes, index } = getAttributesAsMappingFromEventType(eachTransactionEvents, 'message', ['sender:true,module:distribution']);
        
        if (!attributes) throw new Error('set_withdraw_address:delegator_not_found');
        if (index >= 0)
          eachTransactionEvents[index].type = 'message_used';

        value.delegatorAddress = attributes.sender;
      } else {
        continue;
      }

      if (eachEvent.type != 'create_validator')
        messages.push({ time: time, typeUrl: eachEvent.type, value: value });
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
        decodedTxs.push({ messages: messagesFromCreateValidator });

        const filteredTxs = decodedTxs.filter((tx) => tx.messages.length > 0);
        return callback(null, filteredTxs);
      })
  }
};

export default decodeTxsV2;
