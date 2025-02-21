import cron from 'node-cron';
import { fetchValidators } from '../functions/fetchValidators.js';
import { fetchValidatorIpAddress } from '../functions/fetchValidatorIpAddress.js';
import async from 'async';

import Node, { NodeInterface } from '../../models/Node.js';
import Host, { HostInterface } from '../../models/Host.js';

export const Job_SaveNodes = (INTERVAL_TIME_REGEX_STRING: string) => {

  cron.schedule(INTERVAL_TIME_REGEX_STRING, async () => {
    const result = await fetchValidators()
    if (!result) return;

    async.timesSeries(result.validators.length, (i, next) => {
      const eachNodeBody = result.validators[i];
      
      Node.createNewNode(eachNodeBody, (err: String, node: NodeInterface) => {
        if (err) console.error(`${new Date()} | Error: ${err}`); 

        if (node) {
          fetchValidatorIpAddress(node, (err: string, ipAddress: string) => {
            if (err) console.error(`${new Date()} | Error: ${err}`); 
            Host.saveHost({ nodePubkey: node.pubkey, ipAddress: ipAddress }, (err: string, host: HostInterface) => {
              if (err) console.error(`${new Date()} | Error: ${err}`); 
            })
          })
        }
      })
      return next();
    })
  });
};