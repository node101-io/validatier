import { Request, Response } from 'express';

const indexGetController = (req: Request, res: Response): void => {
  res.render('index/index', {
    page: 'index/index',
    title: 'Walrus Blockchain Explorer',
    includes: {
      external: {
        css: ['page', 'general'],
        js: ['page', 'functions'],
      },
    },
  });
};

export default indexGetController;
