import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../../../models/Chain/Chain.js';
import ActiveValidators from '../../../models/ActiveValidators/ActiveValidators.js';

const indexGetController = (req: Request, res: Response): void => {

  const activeNetworkIdentifier = req.cookies.network ? req.cookies.network : 'cosmoshub';
  const bottomTimestamp = req.cookies.selectedDateBottom ? Math.floor(new Date(req.cookies.selectedDateBottom).getTime()): (new Date(1)).getTime();
  const topTimestamp = req.cookies.selectedDateTop ? Math.floor(new Date(req.cookies.selectedDateTop).getTime()): Date.now();

  Promise.allSettled([
    new Promise((resolve) => 
      Chain.getAllChains((err, chains) => resolve({ err: err, chains: chains }))
    ),
    new Promise((resolve) => 
      Validator.rankValidators(
        { sort_by: 'ratio', order: 'desc', bottom_timestamp: bottomTimestamp, top_timestamp: topTimestamp, chain_identifier: activeNetworkIdentifier, with_photos: true },
        (err, validators) => resolve({ err: err, validators: validators })
      )
    ),
    new Promise((resolve) => 
      ActiveValidators.getActiveValidatorHistoryByChain(
        { chain_identifier: activeNetworkIdentifier },
        (err, activeValidatorHistory) => resolve({ err: err, activeValidatorHistory: activeValidatorHistory })
      )
    ),
  ])
    .then((results: Record<string, any>[]) => {
      const [getAllChainsResult, rankValidatorsResult, getActiveValidatorHistoryByChainResult] = results;
      if (
        !getAllChainsResult.value.chains || 
        !rankValidatorsResult.value.validators || 
        !getActiveValidatorHistoryByChainResult.value.activeValidatorHistory
      ) return res.json({ success: false, err: 'bad_request' })
    
      const chains = getAllChainsResult.value.chains;
      const validators = rankValidatorsResult.value.validators;
      const activeValidatorHistory = getActiveValidatorHistoryByChainResult.value.activeValidatorHistory;

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
        selectedChain: selectedChain ? selectedChain : '',
        activeValidatorHistory
      });
    });
};

export default indexGetController;
