import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import { SortOrder } from 'mongoose';
import { isValidSortBy } from '../../../utils/isValidSortBy.js';
import { isValidSortOrder } from '../../../utils/isValidSortOrder.js';

export default (req: Request, res: Response): any => {

  type SortBy = 'total_stake' | 'total_withdraw' | 'sold' | 'self_stake' | 'percentage_sold';

  const { order, sort_by, bottom_timestamp, top_timestamp, chain_identifier } = req.query;

  if (!isValidSortBy(sort_by)) return res.send({ err: 'bad_request', success: false})
  if (!isValidSortOrder(order)) return res.send({ err: 'bad_request', success: false})
  if (typeof bottom_timestamp != 'string' || typeof top_timestamp != 'string' || typeof chain_identifier != 'string') return res.send({ err: 'bad_request', success: false });
  
  const sortBy: SortBy = sort_by;
  const sortOrder: SortOrder = order;
  const bottomTimestamp: string = bottom_timestamp;
  const topTimestamp: string = top_timestamp;
  const chainIdentifier: string = chain_identifier;
  const withPhotos: Boolean = 'with_photos' in req.query;

  Validator.rankValidators(
    { sort_by: sortBy, order: sortOrder, bottom_timestamp: parseInt(bottomTimestamp), top_timestamp: parseInt(topTimestamp), chain_identifier: chainIdentifier, with_photos: withPhotos },
    (err, results) => {
      if (err) return res.json({ success: false, err: 'bad_request' })
      return res.json({
        success: true,
        data: {
          validators: results?.validators,
        }
      });
    });
};
