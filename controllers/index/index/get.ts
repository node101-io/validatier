import { Request, Response } from 'express';
import Validator from '../../../models/Validator/Validator.js';
import Chain, { ChainInterface } from '../../../models/Chain/Chain.js';

const indexGetController = (req: Request, res: Response): void => {

  Chain.getAllChains((err: string | null, chains: ChainInterface[] | null) => {

    let selectedChain: ChainInterface;
    const activeNetworkIdentifier = req.cookies.network;
    if (chains) chains.forEach(element => element.name == activeNetworkIdentifier ? selectedChain = element : (''));

    const bottomTimestamp = req.cookies.selectedDateBottom ? Math.floor(new Date(req.cookies.selectedDateBottom).getTime() / 1000): 1;
    const topTimestamp = req.cookies.selectedDateTop ? Math.floor(new Date(req.cookies.selectedDateTop).getTime() / 1000): 2e9;
    
    Validator.rankValidators({ sort_by: 'ratio', order: 'desc', bottom_timestamp: bottomTimestamp, top_timestamp: topTimestamp, chain_identifier: activeNetworkIdentifier, with_photos: true }, (err, validators) => {
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
        validators,
        selectedDateBottom: req.cookies.selectedDateBottom,
        selectedDateTop: req.cookies.selectedDateTop,
        specificRangeName: req.cookies.specificRangeName,
        specificRange: req.cookies.specificRange,
        chains,
        selectedChain: selectedChain ? selectedChain : ''
      });
    })
  })
};

export default indexGetController;
