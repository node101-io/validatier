import { Request, Response } from 'express';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';
import ActiveValidators from '../../../models/ActiveValidators/ActiveValidators.js';
import { getInactivityIntervals } from '../../../models/ActiveValidators/function/getInactivityIntervalsFromAggregateResult.js';

export const NUMBER_OF_COLUMNS = 90;

export default (req: Request, res: Response): any => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  req.socket.setNoDelay(true);

  const sendData = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const { chain_identifier, operator_address, bottom_timestamp, top_timestamp, pubkey, number_of_columns } = req.query;

  if (
    typeof chain_identifier !== 'string' ||
    typeof bottom_timestamp !== 'string' ||
    typeof top_timestamp !== 'string' ||
    typeof operator_address !== 'string' ||
    typeof pubkey !== 'string' ||
    typeof number_of_columns !== 'string'
  ) {
    sendData({ err: 'format_error', success: false });
    return res.end();
  }

  const bottomTimestamp = parseInt(bottom_timestamp, 10);
  const topTimestamp = parseInt(top_timestamp, 10);
  
  const stepValue = Math.ceil((topTimestamp - bottomTimestamp) / parseInt(number_of_columns));

  let pushedIndex = -1;
  const pendingData: Record<number, any> = {};

  const promises: Promise<void>[] = [];
  let current = bottomTimestamp;
  let index = 0;

  promises.push(
    new Promise<void>((resolve) => {
      ActiveValidators.getActiveValidatorHistoryOfValidator({
        chain_identifier: chain_identifier,
        bottom_timestamp: bottomTimestamp,
        top_timestamp: topTimestamp,
        pubkey: pubkey
      }, (err, activeValidatorHistory) => {
        if (err || !activeValidatorHistory) {
          sendData({ index: -1, err: 'bad_request', success: false });
          return resolve();
        }
        const inactivityIntervals = getInactivityIntervals(activeValidatorHistory);
        sendData({
          success: true,
          isInactivityIntervals: true,
          data: inactivityIntervals,
        });
        resolve();
      })
    })
  );

  while (current < topTimestamp) {
    const start = current;
    const end = Math.min(start + stepValue, topTimestamp);
    const i = index;

    promises.push(
      new Promise<void>((resolve) => {
        CompositeEventBlock.getPeriodicDataForGraphGeneration(
          {
            operator_address: operator_address,
            bottom_timestamp: bottomTimestamp - 86_400_000,
            top_timestamp: end,
            index: i
          },
          (err, result) => {

            if (err || !result) {
              sendData({ index: i, err: 'bad_request', success: false });
              return resolve();
            }

            const { total_stake = 0, total_sold = 0 } = result[operator_address] || {};

            const data = {
              success: true,
              data: {
                total_stake_sum: total_stake || 1,
                total_sold: total_sold || 1,
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
      })
    )

    current += stepValue;
    index++;
  }

  Promise.all(promises).then(() => {
    sendData({ message: 'finished', success: true });
    return res.end();
  });
};
