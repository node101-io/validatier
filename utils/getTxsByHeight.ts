import fetch from 'node-fetch';
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
    fetch(`http://${base_url}/block?height=${block_height}`).then((response: any) => response.json()),
    fetch(`http://${base_url}/block_results?height=${block_height}`).then((response: any) => response.json())
  ])
    .then(([block_promise_res, block_results_promise_res]) => {
      
      if (block_promise_res.status == 'rejected' || !block_promise_res.value || block_results_promise_res.status == 'rejected' || !block_results_promise_res.value)
        return callback(`rejected | block ${block_height}`, { time: null, decodedTxs: []});
      
      const data = block_promise_res.value;
      const data_block_results = block_results_promise_res.value;

      if (
        !data_block_results.result || 
        (
          !data_block_results.result.finalize_block_events && 
          !data_block_results.result.begin_block_events &&
          !data_block_results.result.end_block_events
        ) || 
        !data.result?.block?.data?.txs || 
        data.result?.block?.data?.txs.length <= 0 || 
        !data.result?.block?.header?.height
      ) return callback(null, { time: data.result?.block?.header?.time ? data.result?.block?.header?.time : '', decodedTxs: []});

      const finalizeBlockEvents = [
        ...data_block_results.result.begin_block_events || [],
        ...data_block_results.result.end_block_events || [],
        ...data_block_results.result.finalize_block_events || [],
      ]

      const time = data.result?.block?.header?.time;
      
      const slashMessages: DecodedMessage[] | null = getSlashEventsFromFinalizeBlockEvents(finalizeBlockEvents, bech32_prefix, time);
      const txs: string[] = [];
      const events: Event[][] = [];

      for (let i = 0; i < data_block_results.result.txs_results.length; i++) {
        const tx = data_block_results.result.txs_results[i];
        if (tx.code != 0) continue;
        txs.push(data.result.block.data.txs[i]);
        events.push(tx.events);
      }
        
      const decodedTxs = decodeTxs(txs, events, denom, data.result?.block?.header?.time)
      if (slashMessages && slashMessages.length > 0) decodedTxs.push({ messages: slashMessages });
      
      return callback(null, {
        time: time,
        decodedTxs: decodedTxs
      });
    })
    .catch(err => console.log(err));
}

export default getTxsByHeight;
