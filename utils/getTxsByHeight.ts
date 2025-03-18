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

const getTxsByHeight = async (base_url: string, block_height: number): Promise<any> => {
  try {
    const response = await request(`${base_url}/block?height=${block_height}`);
    const data: any = await response.body.json();

    if (!data.result?.block?.data?.txs || !data.result?.block?.header?.height) {
      throw new Error('bad_request');
    }

    return new Promise((resolve, reject) => {
      decodeTxs(base_url, data.result.block.data.txs, (err: string | null, decodedTxs?: any) => {
        if (err) return reject(err);
        resolve(decodedTxs);
      });
    });
  } catch (error) {
    console.error('Error fetching block data:', error);
    throw error;
  }
};

export default getTxsByHeight;
