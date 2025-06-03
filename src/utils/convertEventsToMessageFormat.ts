import { getOnlyNativeTokenValueFromAmountString } from "../listeners/functions/getOnlyNativeTokenValueFromAmountString.js";
import { convertOperatorAddressToBech32 } from "./convertOperatorAddressToBech32.js";
import { DecodedMessage, Event } from "./decodeTxs.js";

const EVENTS_TO_SEARCH = {
  slash: {
    address_keys: ['address'],
    amount_key: 'burned_coins',
  },
}

export const convertEventsToMessageFormat = (finalizeBlockEvents: Event[], bech32_prefix: string, time: string, denom: string) => {
  const messages: DecodedMessage[] = [];

  finalizeBlockEvents.forEach(eachEvent => {
    const { type, attributes } = eachEvent;
    if (!Object.keys(EVENTS_TO_SEARCH).includes(type)) return;

    const { address_keys, amount_key } = EVENTS_TO_SEARCH[type as keyof typeof EVENTS_TO_SEARCH];

    const messageBody = {
      typeUrl: type,
      time: new Date(time),
      value: {
        validatorAddress: '',
        validatorAddressSender: '',
        validatorAddressRecipient: '',
        amount: ''
      }
    }
    
    let flagToPush = false;

    attributes.forEach(eachAttribute => {
      if (address_keys.includes(eachAttribute.key)) {
        flagToPush = true;
        const operatorAddressValoperFormat = convertOperatorAddressToBech32(eachAttribute.value, `${bech32_prefix}valoper`);
        if (!operatorAddressValoperFormat) return flagToPush = false;

        if (eachAttribute.key == 'recipient')
          messageBody.value.validatorAddressRecipient = operatorAddressValoperFormat;
        else if (eachAttribute.key == 'recipient')
          messageBody.value.validatorAddressSender = operatorAddressValoperFormat;
        else
          messageBody.value.validatorAddress = operatorAddressValoperFormat;
      } else if (eachAttribute.key == amount_key) {
        if (type == 'slash') messageBody.value.amount = eachAttribute.value;
        else {
          const nativeValue = getOnlyNativeTokenValueFromAmountString(eachAttribute.value, denom);
          if (!nativeValue) return flagToPush = false;
          messageBody.value.amount = nativeValue;
        }
      }
    });

    if (flagToPush)
      messages.push(messageBody);
  })

  return messages;
}