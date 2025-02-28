
import async from "async";

interface EventInterface {
  type: string,
  attributes: any[]
}

export const getSpecificAttributeOfAnEventFromTxEventsArray = function (events: EventInterface[], specificEventType: string, specificAttributeKey: string, callback: (err: string | null, specificAttributeValue: string | null) => any) {
  
  async.timesSeries(events.length, (i, next) => {
    const eachEvent: EventInterface = events[i];

    if (eachEvent.type == specificEventType) {
      const attributes = eachEvent.attributes;
      attributes.forEach(eachAttribute => {
        if (eachAttribute.key == specificAttributeKey) {
          return callback(null, eachAttribute.value);
        } else {
          next();
        }
      })
    }

  }, (err) => {
    return callback("not_found", null);
  });
}
