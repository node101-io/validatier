import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import { SortOrder } from 'mongoose';

export default (req: Request, res: Response) => {
  const sortBy = req.query.sort_by as 'self_stake' | 'withdraw' | 'ratio' | 'sold';
  const sortOrder = req.query.order as SortOrder;
  const withPhotos = req.query.with_photos ? true : false as Boolean;
  const bottomTimestamp = req.query.bottom_timestamp as string;
  const topTimestamp = req.query.top_timestamp as string;

  Validator.rankValidators(
    { sort_by: sortBy, order: sortOrder, bottom_timestamp: parseInt(bottomTimestamp), top_timestamp: parseInt(topTimestamp), with_photos: withPhotos },
    (err, validators) => {
      if (err) return res.json({ err: err, success: false });
      return res.json({ success: true, data: validators });
    }
  );
};
