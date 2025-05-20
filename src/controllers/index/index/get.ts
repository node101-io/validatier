import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../../../models/Chain/Chain.js';
import { NUMBER_OF_COLUMNS } from '../../Validator/getGraphData/get.js';
import Cache, { CacheInterface, byArrayMapping } from '../../../models/Cache/Cache.js';

const indexGetController = (req: Request, res: Response): void => {

  console.time('response_time');

  const activeNetworkIdentifier = req.cookies.network ? req.cookies.network : 'cosmoshub';
  const bottomTimestamp = req.cookies.selectedDateBottom ? Math.floor(new Date(req.cookies.selectedDateBottom).getTime()): (new Date(1)).getTime();
  const topTimestamp = req.cookies.selectedDateTop ? Math.floor(new Date(req.cookies.selectedDateTop).getTime()): Date.now();

  const specificRangeName = req.cookies.specificRangeName || 'All time';
  const specificRange = req.cookies.specificRange || 'all_time';

  Promise.allSettled([
    new Promise((resolve) => { 
      Chain.getAllChains((err, chains) => {
        resolve({ err: err, chains: chains });
      })
    }),
    new Promise((resolve) => {      
      if (specificRange && specificRange != 'custom') resolve({ err: null, results: true });
      Validator.rankValidators(
        { sort_by: 'percentage_sold', order: 'asc', bottom_timestamp: bottomTimestamp, top_timestamp: topTimestamp, chain_identifier: activeNetworkIdentifier, with_photos: true },
        (err, results) => {
          resolve({ err: err, results: results });
        }
      )
    }),
    new Promise((resolve) => {
      if (!specificRange || specificRange == 'custom') resolve({ err: null, cache: true });
      Cache.getCacheForChain({
        chain_identifier: activeNetworkIdentifier,
        interval: specificRange
      }, (err, cache) => {
        resolve({ err: err, cache: cache });
      })
    }),
    new Promise((resolve) => {
      if (specificRange && specificRange != 'custom') resolve({ err: null, summaryGraphData: true });
      Validator.getSummaryGraphData({
        chain_identifier: activeNetworkIdentifier,
        bottom_timestamp: bottomTimestamp,
        top_timestamp: topTimestamp,
        by_array: byArrayMapping[specificRange]
      }, (err, summaryGraphData) => {
        resolve({ err: err, summaryGraphData: summaryGraphData });
      })
    }),
    new Promise((resolve) => {
      if (specificRange && specificRange != 'custom') resolve({ err: null, smallGraphData: true });
      Validator.getSmallGraphData({
        chain_identifier: activeNetworkIdentifier,
        bottom_timestamp: bottomTimestamp,
        top_timestamp: topTimestamp
      }, (err, smallGraphData) => {
        resolve({ err: err, smallGraphData: smallGraphData });
      })
    })
  ])
    .then((results: Record<string, any>[]) => {

      const rawGraphMapping = {
        self_staked_and_delegation: {
          dataFields: ['percentage_sold', 'self_stake_sum'],
          colors: ['rgba(255, 149, 0, 1)', 'rgba(50, 173, 230, 1)']
        },
        percentage_sold_graph: {
          dataFields: ['percentage_sold'],
          colors: ['rgba(255, 149, 0, 1)']
        },
        other: {
          dataFields: ['total_stake_sum', 'total_withdraw_sum', 'total_sold'],
          colors: ['rgba(255, 149, 0, 1)', 'rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)']
        },
      };
      
      const graphMapping = new Proxy(rawGraphMapping, {
        get(target: any, prop: any) {
          if (prop in target) {
            return target[prop];
          } else {
            return target.other;
          }
        }
      });

      const [getAllChainsResult, rankValidatorsResult, cacheResults, summaryGraphResults, smallGraphResults] = results;

      if (
        !getAllChainsResult.value.chains || 
        !rankValidatorsResult.value.results ||
        !cacheResults.value.cache || 
        !summaryGraphResults.value.summaryGraphData ||
        !smallGraphResults.value.smallGraphData
      ) return res.json({ success: false, err: 'bad_request' })
    
      const chains = getAllChainsResult.value.chains;

      let summaryData;
      let validators;
      let summaryGraphData;
      let smallGraphData;

      if (specificRange && specificRange != 'custom') {
        const cache: Record<string, any> = {};
        cacheResults.value.cache.forEach((eachCacheSummaryGraphData: CacheInterface) => {
          cache[eachCacheSummaryGraphData.type] = eachCacheSummaryGraphData;
        });

        summaryData = cache.summary_data.data;
        validators = cache.validators.data;
        summaryGraphData = cache.summary_graph.data;
        smallGraphData = cache.small_graph.data;
      } else {
        summaryData = rankValidatorsResult.value.results.summary_data;
        validators = rankValidatorsResult.value.results.validators;
        summaryGraphData = summaryGraphResults.value.summaryGraphData;
        smallGraphData = smallGraphResults.value.smallGraphData;
      }

      const selectedChain = chains.find((element: ChainInterface) => element.name == activeNetworkIdentifier);  

      const queryValidator = req.query.validator
        ? (validators.filter((eachValidator: Record<string, any>) => eachValidator.operator_address == req.query.validator))[0]
        : null;

      const url = req.originalUrl.replace('/', '');

      console.timeEnd('response_time');

      return res.render('index/index', {
        page: 'index/index',
        title: 'CosmosHub Validator Timeline',
        includes: {
          external: {
            css: ['page', 'general', 'header', 'summary', 'validators', 'graph', 'export', 'table'],
            js: ['page', 'functions'],
          },
        },
        summaryData,
        validators,
        summaryGraphData,
        smallGraphData,
        selectedDateBottom: req.cookies.selectedDateBottom || (new Date(selectedChain.first_available_block_time)).toISOString().split('T')[0],
        selectedDateTop: req.cookies.selectedDateTop || (new Date()).toISOString().split('T')[0],
        specificRangeName,
        specificRange,
        startDay: req.cookies.startDay || 'monday',
        currency_type: req.cookies.currency_type || 'native',
        chains,
        isNavbarClose: req.cookies.isNavbarClose,
        selectedChain: selectedChain,
        NUMBER_OF_COLUMNS,
        url,
        queryValidator: queryValidator ? JSON.stringify(queryValidator) : null,
        dataFields: JSON.stringify(graphMapping[url].dataFields),
        colors: JSON.stringify(graphMapping[url].colors),    
      });
    });
};

export default indexGetController;
