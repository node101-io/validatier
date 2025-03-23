import { request } from 'undici';
import decodeTxs, { DecodedMessage } from './decodeTxs.js';
import { getSpecificAttributeOfAnEventFromTxEventsArray } from './getSpecificAttributeOfAnEventFromTxEventsArray.js';
import { convertOperatorAddressToBech32 } from './convertOperatorAddressToBech32.js';

type EventAttribute = { key: string; value: string; index: boolean };
type Event = { type: string, attributes: EventAttribute[] };

export interface DataInterface {
  result: {
    block: {
      header: {
        height: number;
        time: Date;
      };
      data: {
        txs: string[];
      };
    };
  };
}

function filterSlashedEventsWithBurnedCoins(events: Event[]): Event[] {
  return events.filter(event =>
      event.attributes.some(attr => attr.key === "burned_coins")
  );
}

const getTxsByHeight = (base_url: string, block_height: number, denom: string, bech32_prefix: string, callback: (err: string | null, decodedTxs: any) => any) => {
  

  request(`http://${base_url}/block_results?height=${block_height}`)
  .then(response => response.body.json())
  .then((data_block_results: any) => {

    request(`http://${base_url}/block?height=${block_height}`)
    .then(response => response.body.json())
    .then((data: any) => {

      if (!data.result?.block?.data?.txs || data.result?.block?.data?.txs.length <= 0 || !data.result?.block?.header?.height || !data.result?.block?.header?.time) callback(null, []);

      const messages: DecodedMessage[] = [];

      const finalizeBlockEvents = data_block_results.result ? data_block_results.result.finalize_block_events : null;
      if (finalizeBlockEvents) {
        const slashEvents = finalizeBlockEvents.filter((each: Event) => each.type == 'slash');
      
        if (slashEvents) {
          const filteredSlashEvents = filterSlashedEventsWithBurnedCoins(slashEvents);
          if (filteredSlashEvents) {
            filteredSlashEvents.forEach(eachSlashEvent => {
              const attributes = eachSlashEvent.attributes.reduce((acc, { key, value, index }) => {
                acc[key] = { value, index };
                return acc;
              }, {} as Record<string, { value: string; index: boolean }>);
      
              messages.push({
                typeUrl: 'slash',
                time: data.result?.block?.header?.time,
                value: {
                  validatorAddress: convertOperatorAddressToBech32(attributes.address.value, `${bech32_prefix}valoper`),
                  burnedCoins: attributes.burned_coins.value
                }
              })
            })
          }
        }
      }

      const txs: string[] = [];

      if (data_block_results.result) {
        data_block_results.result.txs_results.forEach((tx: any, index: number) => {
          if (tx.code == 0) txs.push(data.result.block.data.txs[index]);
        });
      }

      decodeTxs(base_url, txs, denom, bech32_prefix, data.result?.block?.header?.time, (err: string | null, decodedTxs?: any) => {
        if (err) return callback(err, null);

        if (messages && messages.length > 0) decodedTxs.push({ messages });
        return callback(null, decodedTxs);
      });
    })
    .catch(err => callback(err, null))
  })

};

export default getTxsByHeight;
