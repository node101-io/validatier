import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';
import async from 'async';

export default (req: Request, res: Response): any => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader("X-Accel-Buffering", "no");

  req.socket.setNoDelay(true);

  const sendData = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const { operator_address, bottom_timestamp, top_timestamp, decimals } = req.query;

  if (
    typeof bottom_timestamp !== 'string' ||
    typeof top_timestamp !== 'string' ||
    typeof operator_address !== 'string'
  ) {
    sendData({ err: 'format_error', success: false });
    return res.end();
  }

  const bottomTimestamp = parseInt(bottom_timestamp, 10);
  const topTimestamp = parseInt(top_timestamp, 10);
  const stepValue = 1000000000;
  let pushedIndex: number = -1;
  const pendingData: Record<number, object> = {};
  
  const promises = [];

  let i = 0;
  while (i <  Math.ceil((topTimestamp - bottomTimestamp) / stepValue)) {
    promises.push(
      new Promise((resolve) => 
        CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
          {
            operator_address,
            bottomTimestamp: bottomTimestamp,
            topTimestamp: bottomTimestamp + i * stepValue,
            searchBy: 'timestamp',
          },
          (err, totalPeriodicSelfStakeAndWithdraw) => resolve({ err, totalPeriodicSelfStakeAndWithdraw })
        )
      )
    );
    i++;
  }

  let j = 0;
  while (promises.length) {
    const eachPromise = promises.pop();
    eachPromise?.then((result: any) => {
    
      if (result.err || !result.totalPeriodicSelfStakeAndWithdraw) {
        sendData({ err: 'bad_request', success: false });
        return res.end();
      }

      const totalPeriodicSelfStakeAndWithdraw = result.totalPeriodicSelfStakeAndWithdraw;

      const data = {
        success: true,
        data: {
          self_stake: 3 * ((j ** 2) + 1) * 1e6,
          withdraw: 1 * ((j ** 2) + 1) * 1e6,
          commission: 2 * ((j ** 2) + 1) * 1e6,
          ratio: 2 * ((j ** 2) + 1) * 1e6,
          sold: 2 * ((j ** 2) + 1) * 1e6,
          timestamp: bottomTimestamp + j * stepValue,
          index: j
        }
      };

      pendingData[j] = data;

      while (pendingData[pushedIndex + 1]) {
        pushedIndex++;
        sendData(pendingData[pushedIndex]);
        delete pendingData[pushedIndex];
      }
      j++;
    })
  }

  req.on('close', () => res.end());
};
