import { request } from 'undici';
import decodeTxs, { DecodedMessage } from './decodeTxs.js';

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
  
  request(`http://${base_url}/block?height=${block_height}`)
    .then(response => response.body.json())
    .then((data: any) => {

      if (!data.result?.block?.data?.txs || data.result?.block?.data?.txs.length <= 0 || !data.result?.block?.header?.height || !data.result?.block?.header?.time) callback(null, []);
      
      decodeTxs(base_url, data.result.block.data.txs, denom, bech32_prefix, data.result?.block?.header?.time, (err: string | null, decodedTxs?: any) => {
        if (err) return callback(err, null);
        return callback(null, decodedTxs);
      });
    })
    .catch(err => callback(err, null))
};

export default getTxsByHeight;
