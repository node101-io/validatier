import { request } from 'undici';
import decodeTxs, { DecodedMessage, Event } from './decodeTxs.js';
import { getSlashEventsFromFinalizeBlockEvents } from './getSlashEventsFromFinalizeBlockEvents.js';

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

const getTxsByHeight = (base_url: string, block_height: number, denom: string, bech32_prefix: string, callback: (err: string | null, decodedTxs: any) => any) => {

  Promise.allSettled([
    request(`http://${base_url}/block?height=${block_height}`).then((response: any) => response.body.json()),
    request(`http://${base_url}/block_results?height=${block_height}`).then((response: any) => response.body.json())
  ])
    .then(([block_promise_res, block_results_promise_res]) => {
      if (block_promise_res.status == 'rejected' || !block_promise_res.value || block_results_promise_res.status == 'rejected' || !block_results_promise_res.value) return callback('rejected', null);
      
      const data = block_promise_res.value;
      const data_block_results = block_results_promise_res.value;
      
      if (!data_block_results.result || !data_block_results.result.finalize_block_events || !data.result?.block?.data?.txs || data.result?.block?.data?.txs.length <= 0 || !data.result?.block?.header?.height || !data.result?.block?.header?.time) return callback(null, []);
      const time = data.result?.block?.header?.time;
      const finalizeBlockEvents = data_block_results.result.finalize_block_events;
      
      const slashMessages: DecodedMessage[] | null = getSlashEventsFromFinalizeBlockEvents(finalizeBlockEvents, bech32_prefix, time);
      const txs: string[] = [];
      const events: Event[][] = [];
      data_block_results.result.txs_results.forEach((tx: any, index: number) => {
        if (tx.code == 0) {
          txs.push(data.result.block.data.txs[index]);
          events.push(tx.events);
        };
      })
        
      const decodedTxs = decodeTxs(txs, events, denom, data.result?.block?.header?.time)
      if (slashMessages && slashMessages.length > 0) decodedTxs.push({ messages: slashMessages });
      return callback(null, decodedTxs);
    })
    .catch(err => callback(err, null))
}

export default getTxsByHeight;
