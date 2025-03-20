import { request } from 'undici';
import decodeTxs from './decodeTxs.js';

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

const getTxsByHeight = async (base_url: string, block_height: number, denom: string, bech32_prefix: string): Promise<any> => {
  try {
    const response = await request(`http://${base_url}/block?height=${block_height}`);
    const data: any = await response.body.json();

    return new Promise((resolve, reject) => {
      if (!data.result?.block?.data?.txs || data.result?.block?.data?.txs.length <= 0 || !data.result?.block?.header?.height || !data.result?.block?.header?.time) resolve([]);

      decodeTxs(base_url, data.result.block.data.txs, denom, bech32_prefix, data.result?.block?.header?.time, (err: string | null, decodedTxs?: any) => {
        if (err) return reject(err);
        resolve(decodedTxs);
      });
    });
  } catch (err) {
    throw new Error(`Error fetching block ${block_height}: ${err}`);
  }
};

export default getTxsByHeight;
