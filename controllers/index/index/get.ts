import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';

const indexGetController = (req: Request, res: Response): void => {

  Validator.rankValidators({ sort_by: 'ratio', order: 'desc', bottom_timestamp: 1, top_timestamp: 2e9, with_photos: 'true' }, (err, validators) => {
    if (err) return res.json({ success: false, err: 'bad_request' })
    return res.render('index/index', {
      page: 'index/index',
      title: 'CosmosHub Validator Timeline',
      includes: {
        external: {
          css: ['page', 'general'],
          js: ['page', 'functions'],
        },
      },
      validators
    });
  })
};

export default indexGetController;
