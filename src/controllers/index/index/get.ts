import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../../../models/Chain/Chain.js';
import { NUMBER_OF_COLUMNS } from '../../Validator/getGraphData/get.js';

const indexGetController = (req: Request, res: Response): void => {

  const activeNetworkIdentifier = req.cookies.network ? req.cookies.network : 'cosmoshub';
  const bottomTimestamp = req.cookies.selectedDateBottom ? Math.floor(new Date(req.cookies.selectedDateBottom).getTime()): (new Date(1)).getTime();
  const topTimestamp = req.cookies.selectedDateTop ? Math.floor(new Date(req.cookies.selectedDateTop).getTime()): Date.now();

  Promise.allSettled([
    new Promise((resolve) => { 
      Chain.getAllChains((err, chains) => {
        resolve({ err: err, chains: chains });
      })
    }),
    new Promise((resolve) => {
      console.time('response_time');
      Validator.rankValidators(
        { sort_by: 'percentage_sold', order: 'asc', bottom_timestamp: bottomTimestamp, top_timestamp: topTimestamp, chain_identifier: activeNetworkIdentifier, with_photos: true },
        (err, validators) => {
          console.timeEnd('response_time');
          resolve({ err: err, validators: validators });
        }
      )
    }),
  ])
    .then((results: Record<string, any>[]) => {
      // Validator.getSummaryGraphData({
      //   chain_identifier: activeNetworkIdentifier,
      //   bottom_timestamp: bottomTimestamp,
      //   top_timestamp: topTimestamp
      // }, (err, results) => {
      //   if (err) return console.log(err);
      // })

      const [getAllChainsResult, rankValidatorsResult] = results;
      if (
        !getAllChainsResult.value.chains || 
        !rankValidatorsResult.value.validators
      ) return res.json({ success: false, err: 'bad_request' })
    
      const chains = getAllChainsResult.value.chains;
      const validators = rankValidatorsResult.value.validators;

      const selectedChain = chains.find((element: ChainInterface) => element.name == activeNetworkIdentifier);  

      return res.render('index/index', {
        page: 'index/index',
        title: 'CosmosHub Validator Timeline',
        includes: {
          external: {
            css: ['page', 'general'],
            js: ['page', 'functions'],
          },
        },
        validators,
        selectedDateBottom: req.cookies.selectedDateBottom ? req.cookies.selectedDateBottom : (new Date(selectedChain.first_available_block_time)).toISOString().split('T')[0],
        selectedDateTop: req.cookies.selectedDateTop ? req.cookies.selectedDateTop : (new Date()).toISOString().split('T')[0],
        specificRangeName: req.cookies.specificRangeName ? req.cookies.specificRangeName : 'All time',
        specificRange: req.cookies.specificRange ? req.cookies.specificRange : 'all_time',
        startDay: req.cookies.startDay ? req.cookies.startDay : 'monday',
        currency_type: req.cookies.currency_type ? req.cookies.currency_type : 'native',
        chains,
        isNavbarClose: req.cookies.isNavbarClose,
        selectedChain: selectedChain ? selectedChain : '',
        NUMBER_OF_COLUMNS,
        url: req.originalUrl.replace('/', '')
      });
    });
};

export default indexGetController;
