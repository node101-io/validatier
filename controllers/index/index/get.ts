import { Request, Response } from 'express';

const indexGetController = (req: Request, res: Response): void => {
  res.render('index/index', {
    page: 'index/index',
    title: 'CosmosHub Validator Timeline',
    includes: {
      external: {
        css: ['page', 'general'],
        js: ['page', 'functions'],
      },
    },
  });
};

export default indexGetController;
