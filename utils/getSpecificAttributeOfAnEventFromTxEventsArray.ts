
interface EventInterface {
  type: string;
  attributes: {
    key: string;
    value: string;
    index: boolean;
  }[];
}

const extractInteger = (str: string): number => {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const getSpecificAttributeOfAnEventFromTxEventsArray = function (events: EventInterface[], specificEventType: string, specificAttributeKey: string, callback: (err: string | null, specificAttributeValue: string | null) => any) {
  
  for (let i = 0; i < events.length; i++) {
    const eachEvent = events[i];

    if (eachEvent.type != specificEventType) continue;
 
    const attributes = eachEvent.attributes;
    
    for (let j = 0; j < attributes.length; j++) {
      const eachAttribute: {key: string, value: string} = attributes[j];

      if (eachAttribute.key == specificAttributeKey) return callback(null, extractInteger(eachAttribute.value) ? extractInteger(eachAttribute.value).toString() : '0'); ;
      if (atob(eachAttribute.key) == specificAttributeKey) return callback(null, extractInteger(atob(eachAttribute.value)) ? extractInteger(atob(eachAttribute.value)).toString() : '0'); ;
    }
  };
  return callback('not_found', null);
}
