
import { getOnlyNativeTokenValueFromCommissionOrRewardEvent } from '../listeners/functions/getOnlyNativeTokenValueFromCommissionOrRewardEvent.js';
import { Event } from './decodeTxs.js';

export const getSpecificAttributeOfAnEventFromTxEventsArray = function (events: Event[], specificEventTypes: string[], specificAttributeKey: string, denom: string): string {
  
  let total = 0;

  for (let i = 0; i < events.length; i++) {
    const eachEvent = events[i];

    if (!specificEventTypes.includes(eachEvent.type)) continue;
 
    const attributes = eachEvent.attributes;
    
    for (let j = 0; j < attributes.length; j++) {

      const eachAttribute: {key: string, value: string} = attributes[j];

      let nativeTokenValue = 0;

      try {
        if (eachAttribute.key == specificAttributeKey) nativeTokenValue = parseInt(getOnlyNativeTokenValueFromCommissionOrRewardEvent(eachAttribute.value, denom) ?? '0');
        else if (atob(eachAttribute.key) == specificAttributeKey) nativeTokenValue = parseInt(getOnlyNativeTokenValueFromCommissionOrRewardEvent(atob(eachAttribute.value), denom) ?? '0');
        else continue;
  
        total += nativeTokenValue;
      } catch (err) {
        continue;
      }
    }
  };

  return total.toString();
}
