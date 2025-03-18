import decodeTxs from './decodeTxs.js';
import { request } from 'undici';
export interface DataInterface {
  result: {
    block: {
      header: {
        height: number;
      };
      data: {
        txs: string[];
      };
    };
  };
}

const getTxsByHeight = (base_url: string, block_height: number, callback: (err: string | null, decodedTxs?: [{ messages: any[] }]) => any) => {
  request(`${base_url}/block?height=${block_height}`)
    .then(response => response.body.json())
    .then((data: any) => {
      if (!data.result?.block?.data?.txs || !data.result?.block?.header?.height)
        return callback('bad_request', null);

      decodeTxs(base_url, data.result.block.data.txs, (err: string | null, decodedTxs?: any) => {
        if (err) return callback(err, null);

        return callback(null, decodedTxs);
      });
    })
    .catch(error => {
      console.error('Error fetching block data:', error);
      return callback(error.toString(), null);
    });
};

export default getTxsByHeight;
