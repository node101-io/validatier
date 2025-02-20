import cron from 'node-cron';
import { fetchIpAddresses } from "../functions/fetchValidators.js";
import { fetchValidatorIpAddress } from '../functions/fetchValidatorIpAddress.js';
import async from 'async';

import Node from '../../models/Node.js';
import Host from '../../models/Host.js';

export const Job_SaveNodes = (INTERVAL_TIME_REGEX_STRING: string) => {

  cron.schedule(INTERVAL_TIME_REGEX_STRING, async () => {
    const result = await fetchIpAddresses()

    async.timesSeries(result.validators.length, (i, next) => {
      const eachNodeBody = result.validators[i];
      
      Node.createNewNode(eachNodeBody, (err: String, node: Node) => {
        if (err) console.error(`${new Date()} | Error: ${err}`); 

        if (node) {
          fetchValidatorIpAddress(node, (err: any, ipAddress: string) => {
            if (err) console.error(`${new Date()} | Error: ${err}`); 
            Host.saveHost({ nodePubkey: node.pubkey, ipAddress: ipAddress }, (err: any, host: any) => {
              if (err) console.error(`${new Date()} | Error: ${err}`); 
            })
          })
        }
      })
      return next();
    })
  });
};