import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import { SortOrder } from 'mongoose';

export default (req: Request, res: Response) => {
  const sortBy = req.query.sort_by as 'self_stake' | 'withdraw' | 'ratio' | 'sold';
  const sortOrder = req.query.order as SortOrder;

  Validator.rankValidators(
    { sort_by: sortBy, order: sortOrder },
    (err, validators) => {
      if (err) return res.json({ err: err, success: false });
      return res.json({ success: true, data: validators });
    }
  );
};
