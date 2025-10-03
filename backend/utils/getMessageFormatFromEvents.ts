import { DecodedMessage, Event } from "./decodeTxs.js";

type AttributeMap = { [key: string]: string }

function findAttributes(
  attributes: { key: string; value: string }[],
  keysToFind: string[]
): AttributeMap {
  const found: AttributeMap = {};
  for (const attr of attributes) {
    if (keysToFind.includes(attr.key)) {
      found[attr.key] = attr.value;
    }
  }
  return found;
}

export const getMessageFormatFromEvents = (
  transactionsEventsArray: Event[],
  bech32_prefix: string, 
  time: string, 
  denom: string,
  callback: (
    err: string | null,
    results: DecodedMessage[]
  ) => any
) => {
  transactionsEventsArray
}