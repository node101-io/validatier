
interface EventInterface {
  type: string;
  attributes: {
    key: string;
    value: string;
    index: boolean;
  }[];
}

export const getSpecificAttributeOfAnEventFromTxEventsArray = function (events: EventInterface[], specificEventTypes: string[], specificAttributeKey: string): string | null {
  
  for (let i = 0; i < events.length; i++) {
    const eachEvent = events[i];

    if (!specificEventTypes.includes(eachEvent.type)) continue;
 
    const attributes = eachEvent.attributes;
    
    for (let j = 0; j < attributes.length; j++) {
      const eachAttribute: {key: string, value: string} = attributes[j];

      if (eachAttribute.key == specificAttributeKey) return eachAttribute.value; ;
      if (atob(eachAttribute.key) == specificAttributeKey) return atob(eachAttribute.value);
    }
  };
  return null;
}
