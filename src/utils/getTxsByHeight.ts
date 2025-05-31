import fetch from 'node-fetch';
import decodeTxs, { DecodedMessage, Event } from './decodeTxs.js';
import { convertEventsToMessageFormat } from './convertEventsToMessageFormat.js';

export const RETRY_TOTAL = 10;

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

const getTxsByHeight = (base_url: string, block_height: number, denom: string, bech32_prefix: string, retry_count: number, callback: (err: string | null, decodedTxs: any) => any) => {

  Promise.allSettled([
    fetch(`http://${base_url}/block?height=${block_height}`, { signal: AbortSignal.timeout(15 * 1000) }).then((response: any) => response.json()),
    fetch(`http://${base_url}/block_results?height=${block_height}`, { signal: AbortSignal.timeout(15 * 1000) }).then((response: any) => response.json())
  ])
    .then(([block_promise_res, block_results_promise_res]) => {
      
      if (retry_count >= RETRY_TOTAL) return callback(`max_retry_count exceeded`, { block_height: block_height })
      if (block_promise_res.status == 'rejected' || !block_promise_res.value || block_results_promise_res.status == 'rejected')
        return getTxsByHeight(base_url, block_height, denom, bech32_prefix, retry_count + 1, callback);
      
      const data = block_promise_res.value;
      const data_block_results = block_results_promise_res.value;

      if (data_block_results.error)
        return callback(JSON.stringify(data_block_results.error), { time: '', decodedTxs: []});
      if (!data.result?.block?.header?.height || data.result?.block?.header?.height != block_height)
        return callback('block_height_not_available_or_different', { time: '', decodedTxs: []});
      if (!data.result?.block?.header?.time)
        return callback('no_timestamp_available', { time: '', decodedTxs: []});

      if (
        !data_block_results.result || 
        (
          !data_block_results.result.finalize_block_events && 
          !data_block_results.result.begin_block_events &&
          !data_block_results.result.end_block_events
        ) || 
        !data.result?.block?.data?.txs || 
        data.result?.block?.data?.txs.length <= 0
      ) return callback(null, { time: data.result?.block?.header?.time ? data.result?.block?.header?.time : '', decodedTxs: []});

      const finalizeBlockEvents = [
        ...data_block_results.result.begin_block_events || [],
        ...data_block_results.result.end_block_events || [],
        ...data_block_results.result.finalize_block_events || [],
      ]

      const time = data.result?.block?.header?.time;
      
      const messages: DecodedMessage[] | null = convertEventsToMessageFormat(finalizeBlockEvents, bech32_prefix, time, denom);
      const txs: string[] = [];
      const events: Event[][] = [];

      for (let i = 0; i < data_block_results.result.txs_results.length; i++) {
        const tx = data_block_results.result.txs_results[i];
        if (tx.code != 0) continue;
        txs.push(data.result.block.data.txs[i]);
        events.push(tx.events);
      }
        
      const decodedTxs = decodeTxs(txs, events, denom, data.result?.block?.header?.time)
      if (messages && messages.length > 0) decodedTxs.push({ messages: messages });
      
      return callback(null, {
        time: time,
        decodedTxs: decodedTxs
      });
    })
    .catch(err => callback(err, { block_height: block_height }));
}

export default getTxsByHeight;
