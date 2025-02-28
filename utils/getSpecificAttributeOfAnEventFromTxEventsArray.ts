
interface EventInterface {
  type: string,
  attributes: any[]
}

export const getSpecificAttributeOfAnEventFromTxEventsArray = function (events: EventInterface[], specificEventType: string, specificAttributeKey: string, callback: (err: string | null, specificAttributeValue: string | null) => any) {
  events.forEach((eachEvent: EventInterface) => {
    if (eachEvent.type == specificEventType) {
      const attributes = eachEvent.attributes;
      attributes.forEach(eachAttribute => {
        if (eachAttribute.key == specificAttributeKey) {
          return callback(null, eachAttribute.value);
        } 
      })
    }
  });
  return callback("not_found", null);
}
