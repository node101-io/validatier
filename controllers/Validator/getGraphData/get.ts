import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';
import async from 'async';

export default (req: Request, res: Response): any => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

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
  const stepValue = 4000000000;

  async.timesSeries(
    Math.ceil((topTimestamp - bottomTimestamp) / stepValue), 
    (i, next) => {

      CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
        {
          operator_address,
          bottomTimestamp: bottomTimestamp,
          topTimestamp: bottomTimestamp + i * stepValue,
          searchBy: 'timestamp'
        },
        (err, totalPeriodicSelfStakeAndWithdraw) => {
          if (err || !totalPeriodicSelfStakeAndWithdraw) {
            console.log(err)
            sendData({ err: 'bad_request', success: false });
            return res.end();
          }

          const ratio = (totalPeriodicSelfStakeAndWithdraw?.self_stake || 0) / (totalPeriodicSelfStakeAndWithdraw?.withdraw || 10 ** Number(decimals));
          const sold = (totalPeriodicSelfStakeAndWithdraw?.withdraw || 0) - (totalPeriodicSelfStakeAndWithdraw?.self_stake || 0);
          
          sendData({
            success: true,
            data: {
              self_stake: Math.random() * 20,
              withdraw: Math.random() * 20,
              ratio: Math.random() * 20,
              sold: Math.random() * 20,
              timestamp: bottomTimestamp + i * stepValue,
            },
          });

          next();
        }
      );
    },
    (err) => {
      if (err) {
        sendData({ err: 'internal_error', success: false });
        return res.end();
      }
      res.end();
    }
  );

  req.on('close', () => res.end());
};
