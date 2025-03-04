import async from 'async';
import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import CompositeEventBlock from '../../../models/CompositeEventBlock/CompositeEventBlock.js';

const indexGetController = (req: Request, res: Response): void => {

  Validator
    .find({})
    .then((validators) => {
      async.timesSeries(
        validators.length,
        (i, next) => {
          const eachValidator: any = validators[i];

          CompositeEventBlock
            .getTotalPeriodicSelfStakeAndWithdraw(
              {
                operator_address: eachValidator.operator_address,
                bottomBlockHeight: 0,
                topBlockHeight: 1e8,
                searchBy: 'block_height'
              },
              (err, totalPeriodicSelfStakeAndWithdraw) => {
                if (err) return res.json({ success: false, err: 'bad_request' })
                eachValidator['self_stake'] = totalPeriodicSelfStakeAndWithdraw?.self_stake;
                eachValidator['withdraw'] = totalPeriodicSelfStakeAndWithdraw?.withdraw;
                eachValidator['ratio'] = (totalPeriodicSelfStakeAndWithdraw?.self_stake ? totalPeriodicSelfStakeAndWithdraw?.self_stake : 0) / (totalPeriodicSelfStakeAndWithdraw?.withdraw ? totalPeriodicSelfStakeAndWithdraw?.withdraw : 1);
                
                return next()
              }
            )
        }, 
        (err) => {
          if (err) return res.json({ success: false, err: 'bad_request' });

          validators.sort((a: any, b: any) => (b.ratio || 0) - (a.ratio || 0));

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
        }
      )
    }).catch(err => res.json({ success: false, err: 'bad_request' }));
};

export default indexGetController;
