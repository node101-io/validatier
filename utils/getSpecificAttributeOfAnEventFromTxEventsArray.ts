
interface EventInterface {
  type: string,
  attributes: any[]
}

export const getSpecificAttributeOfAnEventFromTxEventsArray = function (events: EventInterface[], specificEventType: string, specificAttributeKey: string, callback: (err: string | null, specificAttributeValue: any) => any) {
  
  for (let i = 0; i < events.length; i++) {
    const eachEvent = events[i];

    if (eachEvent.type != specificEventType) continue;
 
    const attributes = eachEvent.attributes;
    for (let j = 0; j < attributes.length; j++) {
      const eachAttribute: {key: string, value: string} = attributes[j];
          
      if (eachAttribute.key != specificAttributeKey) continue;
      return callback(null, eachAttribute.value); 
    }
  };
  return callback("not_found", null);
}
