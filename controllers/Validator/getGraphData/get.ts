import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';

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

  let iter = bottomTimestamp;
  const promises = [];

  while (iter < topTimestamp) {
    promises.push(
      new Promise((resolve) => {
        const currentTopTimestamp = iter + stepValue;
        CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw(
          {
            operator_address,
            bottomTimestamp: bottomTimestamp,
            topTimestamp: currentTopTimestamp,
            searchBy: 'timestamp'
          },
          (err, totalPeriodicSelfStakeAndWithdraw) => {
            if (err || !totalPeriodicSelfStakeAndWithdraw) return resolve({ err: 'bad_request', success: false });

            const ratio = (totalPeriodicSelfStakeAndWithdraw?.self_stake || 0) / (totalPeriodicSelfStakeAndWithdraw?.withdraw || 10 ** Number(decimals));
            const sold = (totalPeriodicSelfStakeAndWithdraw?.withdraw || 0) - (totalPeriodicSelfStakeAndWithdraw?.self_stake || 0);
            
            resolve({
              success: true,
              data: {
                self_stake: Math.random() * 20,
                withdraw: Math.random() * 20,
                ratio: Math.random() * 20,
                sold: Math.random() * 20,
                timestamp: currentTopTimestamp,
              },
            });
          }
        );
      })
    );
    iter += stepValue;
  }

  Promise.allSettled(promises).then(values => values.forEach((value: any) => {console.log(value.value);sendData(value.value)}))

  req.on('close', () => res.end());
};
