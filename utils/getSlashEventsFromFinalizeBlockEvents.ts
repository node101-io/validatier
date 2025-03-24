import { convertOperatorAddressToBech32 } from "./convertOperatorAddressToBech32.js";
import { DecodedMessage, Event } from "./decodeTxs.js";

function filterSlashedEventsWithBurnedCoins(events: Event[]): Event[] {
  return events.filter(event =>
      event.attributes.some(attr => attr.key === "burned_coins")
  );
}

export const getSlashEventsFromFinalizeBlockEvents = (finalizeBlockEvents: Event[], bech32_prefix: string, time: string) => {
  const slashEvents = finalizeBlockEvents.filter((each: Event) => each.type == 'slash');
  if (!slashEvents) return null;
  
  const filteredSlashEvents = filterSlashedEventsWithBurnedCoins(slashEvents);
  if (!filteredSlashEvents) return null;

  const slashEventsResultArray: DecodedMessage[] = [];

  filteredSlashEvents.forEach(eachSlashEvent => {
    const attributes = eachSlashEvent.attributes.reduce((acc, { key, value, index }) => {
      acc[key] = { value, index };
      return acc;
    }, {} as Record<string, { value: string; index: boolean }>);

    slashEventsResultArray.push({
      typeUrl: 'slash',
      time: new Date(time),
      value: {
        validatorAddress: convertOperatorAddressToBech32(attributes.address.value, `${bech32_prefix}valoper`),
        burnedCoins: attributes.burned_coins.value
      }
    });
  });

  return slashEventsResultArray;
}
