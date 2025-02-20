import cron from 'node-cron';
import { fetchIpAddresses } from "./functions/fetchIpAddresses.js";
import async from 'async';

import Node from '../models/node.js';

const DEVELOPMENT_FIVE_SECOND_REGEX_STRING = '*/5 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';

const ERROR_NOT_LOG_LIST: String[] = [
  "duplicate_node_address",
  "duplicate_node_public_key",
];

export const Job_SaveNodes = () => {

  cron.schedule(DEVELOPMENT_FIVE_SECOND_REGEX_STRING, async () => {
    const result = await fetchIpAddresses()

    async.timesSeries(result.validators.length, (i, next) => {
      const eachNodeBody = result.validators[i];
      
      Node.createNewNode(eachNodeBody, (err: String, newNode: Node) => {
        if (
          err != null
          && !ERROR_NOT_LOG_LIST.includes(err)
        ) console.error(`${new Date()} | Error: ${err}`); 
      })
      return next();
    })
  });
};