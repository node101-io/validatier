import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import { SortOrder } from 'mongoose';
import { isValidSortBy } from '../../../utils/isValidSortBy.js';
import { isValidSortOrder } from '../../../utils/isValidSortOrder.js';

export default (req: Request, res: Response): any => {

  type SortBy = 'self_stake' | 'withdraw' | 'ratio' | 'sold'; 

  const { order, sort_by, bottom_timestamp, top_timestamp } = req.query;
  
  if (!isValidSortBy(sort_by)) return res.send({ err: 'bad_request', success: false})
  if (!isValidSortOrder(order)) return res.send({ err: 'bad_request', success: false})
  if (typeof bottom_timestamp !== 'string' || typeof top_timestamp !== 'string') return res.send({ err: 'bad_request', success: false });
  
  const sortBy: SortBy = sort_by;
  const sortOrder: SortOrder = order;
  const bottomTimestamp: string = bottom_timestamp;
  const topTimestamp: string = top_timestamp;
  const withPhotos: Boolean = 'with_photos' in req.query;

  Validator.rankValidators(
    { sort_by: sortBy, order: sortOrder, bottom_timestamp: parseInt(bottomTimestamp), top_timestamp: parseInt(topTimestamp), with_photos: withPhotos },
    (err, validators) => {
      if (err) return res.json({ err: err, success: false });
      return res.json({ success: true, data: validators });
    }
  );
};
