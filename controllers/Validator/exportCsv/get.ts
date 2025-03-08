
import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import { SortOrder } from 'mongoose';
import { getCsvZipBuffer } from '../../../models/Validator/functions/getCsvZipBuffer.js';
import { formatTimestamp } from '../../../utils/formatTimestamp.js';

export default (req: Request, res: Response) => {

  const sortBy = req.query.sort_by as 'self_stake' | 'withdraw' | 'ratio' | 'sold';
  const sortOrder = req.query.order as SortOrder;
  const bottomTimestamp = req.query.bottom_timestamp as string;
  const topTimestamp = req.query.top_timestamp as string;
  const range = req.query.range as string;

  Validator.exportCsv(
    { sort_by: sortBy, order: sortOrder, bottom_timestamp: parseInt(bottomTimestamp), top_timestamp: parseInt(topTimestamp), range: parseInt(range) },
    (err, csvExportData) => {
      if (err) return res.json({ success: false, err: err });
      getCsvZipBuffer(csvExportData, (err, zipBuffer) => {
        if (err) return res.json({ success: false, err: err });

        res.setHeader('Content-Disposition', `attachment; filename=validator-timeline-${formatTimestamp(parseInt(bottomTimestamp))}-${formatTimestamp(parseInt(topTimestamp))}.zip`);
        res.setHeader('Content-Type', 'application/zip');
        return res.send(zipBuffer);
      })
    }
  )
}
