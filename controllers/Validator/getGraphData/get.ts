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

  async.times(
    Math.ceil((topTimestamp - bottomTimestamp) / stepValue),
    (i, next) => {
      CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
        {
          operator_address,
          bottomTimestamp: bottomTimestamp,
          topTimestamp: bottomTimestamp + i * stepValue,
          searchBy: 'timestamp',
        },
        (err, totalPeriodicSelfStakeAndWithdraw) => {
          if (err || !totalPeriodicSelfStakeAndWithdraw) {
            sendData({ err: 'bad_request', success: false });
            return res.end();
          }

          const data = {
            success: true,
            data: {
              self_stake: 3 * ((i ** 2) + 1) * 1e6 * Math.sin(i),
              withdraw: 1 * ((i ** 2) + 1) * 1e6 * Math.cos(i),
              commission: 2 * ((i ** 2) + 1) * 1e6 * Math.sin(i),
              ratio: 2 * ((i ** 2) + 1) * 1e6 * Math.cos(i),
              sold: 2 * ((i ** 2) + 1) * 1e6 * Math.sin(i),
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

          return next();
        }
      );
    },
    (err) => {
      if (err) {
        sendData({ err: 'internal_error', success: false });
      }
      return res.end();
    }
  );

  req.on('close', () => res.end());
};
