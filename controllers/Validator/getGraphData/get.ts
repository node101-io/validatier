import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';

export default (req: Request, res: Response): any => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  req.socket.setNoDelay(true);

  const sendData = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const { operator_address, bottom_timestamp, top_timestamp } = req.query;

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
  const stepValue = 2000000000;
  let pushedIndex = -1;
  const pendingData: Record<number, any> = {};

  const promises: Promise<void>[] = [];
  let current = bottomTimestamp;
  let index = 0;

  while (current < topTimestamp) {
    const start = current;
    const end = Math.min(current + stepValue, topTimestamp);
    const i = index;

    const promise = new Promise<void>((resolve) => {
      CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
        {
          operator_address,
          bottomTimestamp: start,
          topTimestamp: end,
          searchBy: 'timestamp',
        },
        (err, result) => {
          if (err || !result) {
            sendData({ index: i, err: 'bad_request', success: false });
            return resolve();
          }

          const data = {
            success: true,
            data: {
              self_stake: 3 * ((i ** 2) + 1) * 1e6,
              withdraw: 1 * ((i ** 2) + 1) * 1e6,
              commission: 2 * ((i ** 2) + 1) * 1e6,
              ratio: 2 * ((i ** 2) + 1) * 1e6,
              sold: 2 * ((i ** 2) + 1) * 1e6,
              timestamp: bottomTimestamp + i * stepValue,
              index: i
            },
          };

          pendingData[i] = data;

          while (pendingData[pushedIndex + 1]) {
            pushedIndex++;
            sendData(pendingData[pushedIndex]);
            delete pendingData[pushedIndex];
          }

          resolve();
        }
      );
    });

    promises.push(promise);
    current += stepValue;
    index++;
  }

  Promise.all(promises).then(() => {
    res.end();
  });
};
