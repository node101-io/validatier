import { Request, Response } from 'express';
import { ValidatorInterface } from '../../../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../../../models/Chain/Chain.js';
import { NUMBER_OF_COLUMNS } from '../../Validator/getGraphData/get.js';
import Cache from '../../../models/Cache/Cache.js';

const dayAsMilliseconds = 24 * 60 * 60 * 1000;

const graphMapping = new Proxy({
  // self_staked_and_delegation: {
  //   graph_title: 'Self-Staked & Delegation',
  //   graph_description: 'Total Self-Staked & Total Delegation',
  //   dataFields: ['total_stake_sum', 'self_stake_sum'],
  //   colors: ['rgba(255, 149, 0, 1)', 'rgba(88, 86, 214, 1)']
  // },
  percentage_sold_graph: {
    graph_title: 'Percentage Sold Graph',
    graph_description: 'Total Sold / Total Reward Withdrawn',
    dataFields: ['percentage_sold', 'price'],
    colors: ['rgba(255, 149, 0, 1)', 'rgba(88, 86, 214, 1)']
  },
  other: {
    graph_title: 'Reward Flow Overview',
    graph_description: 'Shows how validators respond to changes in price and delegation in the market',
    dataFields: ['price', 'total_sold', 'total_stake_sum'],
    colors: ['rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)', 'rgba(255, 149, 0, 1)']
  },
}, {
  get(target: any, prop: any) {
    if (prop in target) {
      return target[prop];
    } else {
      return target.other;
    }
  }
});

const isDev = process.env.NODE_ENV === 'development';

export default (req: Request, res: Response): void => {
  if (isDev) console.time('response_time');

  const chainIdentifier = req.cookies.network ? req.cookies.network : 'cosmoshub';

  const bottomTimestamp = req.cookies.selectedDateBottom ? Math.floor(new Date(req.cookies.selectedDateBottom).getTime()) : new Date().getTime() - dayAsMilliseconds * 365;
  const topTimestamp = req.cookies.selectedDateTop ? Math.floor(new Date(req.cookies.selectedDateTop).getTime()) : new Date().getTime();

  const specificRangeName = req.cookies.specificRangeName || 'Last year';

  if (isDev) console.time('getAllChains_time');
  Chain.getAllChains((err, chains) => {
    if (isDev) console.timeEnd('getAllChains_time');
    if (err || !chains) return res.json({ success: false, err: 'bad_request' });

    if (isDev) console.time('cache_time');
    Cache.getCacheForChain({
      chain_identifier: chainIdentifier,
      interval: req.cookies.specificRange || 'last_365_days',
    }, (err, cacheResult) => {
      if (isDev) console.timeEnd('cache_time');
      if (err || !cacheResult) return res.json({ success: false, err: 'bad_request' });

      const data = cacheResult[0];

      const cummulativeActiveListData = data.cummulative_active_list
        .filter(each => ((Math.abs(topTimestamp - bottomTimestamp) / 86400000) / 90) <= each.count)
        .map(each => each._id);

      const queryValidator = req.query.validator ? data.validators.find(each => each.operator_address == req.query.validator) : null;

      const url = req.originalUrl.replace('/', '');

      if (isDev) console.timeEnd('response_time');

      return res.render('index/index', {
        page: 'index/index',
        title: 'Validatier',
        includes: {
          external: {
            css: ['page', 'general', 'header', 'summary', 'validators', 'graph', 'export', 'table', 'intro', 'mobile_start'],
            js: ['page', 'functions'],
          },
        },
        summaryData: data.summary_data,
        validators: data.validators.filter((eachValidator: ValidatorInterface) => cummulativeActiveListData.includes(eachValidator.pubkey)),
        summaryGraphData: data.summary_graph,
        smallGraphData: data.small_graph,
        selectedDateBottom: req.cookies.selectedDateBottom || (new Date(bottomTimestamp)).toISOString().split('T')[0],
        selectedDateTop: req.cookies.selectedDateTop || (new Date(topTimestamp)).toISOString().split('T')[0],
        specificRangeName,
        specificRange: req.cookies.specificRange || 'last_365_days',
        startDay: req.cookies.startDay || 'monday',
        currency_type: req.cookies.currency_type || 'native',
        chains: chains,
        isNavbarClose: req.cookies.isNavbarClose,
        selectedChain: chains.find((element: ChainInterface) => element.name == chainIdentifier),
        NUMBER_OF_COLUMNS,
        url,
        queryValidator: queryValidator ? JSON.stringify(queryValidator) : null,
        dataFields: JSON.stringify(graphMapping[url].dataFields),
        colors: JSON.stringify(graphMapping[url].colors),
        graph_title: graphMapping[url].graph_title,
        graph_description: graphMapping[url].graph_description,
        validatorGraph: {
          dataFields: ['price', 'total_sold', 'total_stake_sum'],
          colors: ['rgba(50, 173, 230, 1)', 'rgba(88, 86, 214, 1)', 'rgba(255, 149, 0, 1)']
        },
        priceGraphData: data.price_graph,
        isStartClicked: req.cookies.isStartClicked,
      })
    });
  });
};;
