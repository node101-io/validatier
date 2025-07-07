import { validValidatorAddress } from "../listeners/functions/constants.js";
import { getOnlyNativeTokenValueFromAmountString } from "../listeners/functions/getOnlyNativeTokenValueFromAmountString.js";
import { convertOperatorAddressToBech32 } from "./convertOperatorAddressToBech32.js";
import { DecodedMessage, Event } from "./decodeTxsV2.js";

const EVENTS_TO_SEARCH = {
  slash: {
    address_keys: ['address'],
    amount_key: 'burned_coins',
  },
  transfer: {
    address_keys: ['recipient', 'sender'],
    amount_key: 'amount',
  },
  complete_redelegation: {
    address_keys: ['delegator', 'source_validator', 'destination_validator'],
    amount_key: 'amount',
  },
  complete_unbonding: {
    address_keys: ['delegator', 'validator'],
    amount_key: 'amount',
  },
}

export const convertEventsToMessageFormat = (finalizeBlockEvents: Event[], bech32_prefix: string, time: Date | null, denom: string) => {
  const messages: DecodedMessage[] = [];

  finalizeBlockEvents.forEach(eachEvent => {
    const { type, attributes } = eachEvent;
    if (!Object.keys(EVENTS_TO_SEARCH).includes(type)) return;

    const { address_keys, amount_key } = EVENTS_TO_SEARCH[type as keyof typeof EVENTS_TO_SEARCH];

    const messageBody = {
      typeUrl: type,
      time: time ? new Date(time) : null,
      value: {
        validatorAddress: '',
        validatorAddressSender: '',
        validatorAddressRecipient: '',
        delegatorAddress: '',
        validatorSrcArress: '',
        validatorDstArress: '',
        amount: ''
      }
    }
    
    let gotValidatorAddress = false;
    let gotAmount = false;

    attributes.forEach(eachAttribute => {
      if (address_keys.includes(eachAttribute.key)) {
        const operatorAddressValoperFormat = convertOperatorAddressToBech32(eachAttribute.value, `${bech32_prefix}valoper`);
        
        if (
          !operatorAddressValoperFormat ||
          !validValidatorAddress.includes(operatorAddressValoperFormat.replace('cosmosvaloper1', ''))
        ) return;

        
        if (eachAttribute.key == 'recipient')
          messageBody.value.validatorAddressRecipient = operatorAddressValoperFormat;
        else if (eachAttribute.key == 'sender')
          messageBody.value.validatorAddressSender = operatorAddressValoperFormat;
        else if (eachAttribute.key == 'delegator')
          messageBody.value.delegatorAddress = operatorAddressValoperFormat;
        else if (eachAttribute.key == 'source_validator')
          messageBody.value.validatorSrcArress = operatorAddressValoperFormat;
        else if (eachAttribute.key == 'destination_validator')
          messageBody.value.validatorDstArress = operatorAddressValoperFormat;
        else
          messageBody.value.validatorAddress = operatorAddressValoperFormat;
        gotValidatorAddress = true;
      } else if (eachAttribute.key == amount_key) {
        if (type == 'slash') {
          messageBody.value.amount = eachAttribute.value;
          gotAmount = true;
        }
        else {
          const nativeValue = getOnlyNativeTokenValueFromAmountString(eachAttribute.value, denom);
          if (!nativeValue) return gotAmount = false;
          messageBody.value.amount = nativeValue;
          gotAmount = true;
        }
      }
    });

    if (gotValidatorAddress && gotAmount)
      messages.push(messageBody);
  })

  return messages;
}