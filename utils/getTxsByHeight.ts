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

const getTxsByHeight = async (base_url: string, block_height: number, denom: string): Promise<any> => {
  try {
    const response = await fetch(`${base_url}/block?height=${block_height}`);
    const data: DataInterface = await response.json();

    return new Promise((resolve, reject) => {
      if (!data.result?.block?.data?.txs || data.result?.block?.data?.txs.length <= 0 || !data.result?.block?.header?.height || !data.result?.block?.header?.time) resolve([]);

      decodeTxs(base_url, data.result.block.data.txs, denom, data.result?.block?.header?.time, (err: string | null, decodedTxs?: any) => {
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
