import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';

export const NUMBER_OF_COLUMNS = 50;

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
  
  const stepValue = Math.ceil((topTimestamp - bottomTimestamp) / NUMBER_OF_COLUMNS);

  let pushedIndex = -1;
  const pendingData: Record<number, any> = {};

  const promises: Promise<void>[] = [];
  let current = bottomTimestamp;
  let index = 0;

  while (current < topTimestamp) {
    const start = current;
    const end = Math.min(start + stepValue, topTimestamp);
    const i = index;

    const promise = new Promise<void>((resolve) => {
      CompositeEventBlock.getPeriodicDataForGraphGeneration(
        {
          operator_address: operator_address,
          bottom_timestamp: bottomTimestamp,
          top_timestamp: end,
          search_by: 'timestamp',
        },
        (err, result) => {

          if (err || !result) {
            sendData({ index: i, err: 'bad_request', success: false });
            return resolve();
          }

          const { self_stake = 0, reward = 0, commission = 0, average_total_stake = 0, average_withdraw = 0 } = result[operator_address] || {};

          const ratio = (self_stake || 0) / (reward || (10 ** 10e6));
          const sold = (reward || 0) - (self_stake || 0);

          const data = {
            success: true,
            data: {
              self_stake: self_stake || 1,
              withdraw: reward || 1,
              commission: commission || 1,
              ratio: ratio || 1,
              sold: sold || 1,
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
