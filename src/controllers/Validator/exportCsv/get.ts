
import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import { SortOrder } from 'mongoose';
import { getCsvZipBuffer } from '../../../models/Validator/functions/getCsvZipBuffer.js';
import { formatTimestamp } from '../../../utils/formatTimestamp.js';
import { isValidSortBy } from '../../../utils/isValidSortBy.js';
import { isValidSortOrder } from '../../../utils/isValidSortOrder.js';
import Cache from '../../../models/Cache/Cache.js';

export default (req: Request, res: Response): any => {

  type SortBy = 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold';

  const { order, sort_by, bottom_timestamp, top_timestamp, range, chain_identifier, specific_range, range_id } = req.query;
  
  if (!isValidSortBy(sort_by)) return res.send({ err: 'bad_request1', success: false});
  if (!isValidSortOrder(order)) return res.send({ err: 'bad_request2', success: false});
  if (typeof chain_identifier != 'string' || typeof range_id != 'string' || typeof specific_range != 'string' || typeof bottom_timestamp != 'string' || typeof top_timestamp != 'string' || typeof range != 'string') return res.send({ err: 'bad_request3', success: false });

  if (!['all_time', 'yearly', 'monthly', 'weekly'].includes(range_id)) return res.send({ err: 'bad_request', success: false});
  
  const chainIdentifier: string = chain_identifier;
  const sortBy: SortBy = sort_by;
  const sortOrder: SortOrder = order;
  const bottomTimestamp: string = bottom_timestamp;
  const topTimestamp: string = top_timestamp;
  const rangeValue: string = range;
  const specificRange: string = specific_range;
  const rangeId: string = range_id;

  Promise.allSettled([
    new Promise((resolve) => {
      if (!specificRange && specificRange == 'custom') return resolve({ err: null, result: true });
      Cache.getCacheForChain(
        {
          chain_identifier: chainIdentifier,
          interval: specific_range,
          type: 'export'
        },
        (err, cacheResult) => {
          if (err || !cacheResult) return resolve({ success: false, err: 'bad_request' });
          const data = cacheResult[0].data;
          return resolve({ err: null, result: data[rangeId as keyof typeof data] });
        })
    }),
    new Promise((resolve) => {
      if (specificRange && specificRange != 'custom') return resolve({ err: null, result: true });
      Validator.exportCsv(
        { sort_by: sortBy, order: sortOrder, bottom_timestamp: parseInt(bottomTimestamp), top_timestamp: parseInt(topTimestamp), range: parseInt(rangeValue), chain_identifier: chainIdentifier },
        (err, csvExportData) => {
          if (err) return resolve({ success: false, err: err });
          return resolve({ err: null, result: csvExportData });
        })
    }),
  ])
    .then((result: Record<string, any>[]) => {
      const [cacheExportResult, exportResult] = result;
      if (!cacheExportResult.value || !exportResult.value) return res.json({ success: false, err: 'bad_request' });;
      const csvExportData = (!specificRange && specificRange == 'custom')
        ? exportResult.value.result
        : cacheExportResult.value.result;
        
      getCsvZipBuffer(csvExportData, (err, zipBuffer) => {
        if (err) return res.json({ success: false, err: err });
        
        if (!parseInt(rangeValue)) {
          const fileName = `validator-timeline-${formatTimestamp(parseInt(bottomTimestamp))}-${formatTimestamp(parseInt(topTimestamp))}.csv`;
          res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
          res.setHeader('Content-Type', 'text/csv');
          return res.send(csvExportData[Object.keys(csvExportData)[0]]); 
        } else {
          res.setHeader('Content-Disposition', `attachment; filename=validator-timeline-${formatTimestamp(parseInt(bottomTimestamp))}-${formatTimestamp(parseInt(topTimestamp))}.zip`);
          res.setHeader('Content-Type', 'application/zip');
          return res.send(zipBuffer);
        }
      });
    }
  )
}
