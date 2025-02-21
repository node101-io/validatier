
import cron from 'node-cron';
import { getIpLookupData } from "../functions/getIpLookupData.js";
import async from 'async';

import CacheServer, { CacheServerInterface } from "../../models/CacheServer.js";
import HostName, { HostNameInterface } from "../../models/HostName.js";
import HostingService, { HostingServiceInterface } from "../../models/HostingService.js";
import Location, { LocationInterface } from "../../models/Location.js";
import NodeDataLog, { NodeDataLogInterface } from "../../models/NodeDataLog.js";

// This comes from the Host model, which will be formed by the first cron job
const MOCKUP_HOST_ARRAY = [
  {
    nodePubkey: "0x7b705e8671089465009c9627f55f20057b8c878b573bcc71971c970f500f1b29",
    ipAddress: "172.67.207.44"
  },
  {
    nodePubkey: "0x20ff28bc773c52abed7c4ecdc472e4e0f85fe112ec8a4c0e8286f20fe7ba8290",
    ipAddress: "104.26.3.94"
  },
  {
    nodePubkey: "0xfaf9ba6df6256ab0103dbb8839369c3dca519f7d108320c02dabe51655f6238e",
    ipAddress: "13.35.78.113"
  }
];


export const Job_SaveChangesAndDataLogs = (INTERVAL_TIME_REGEX_STRING: string) => {

  cron.schedule(INTERVAL_TIME_REGEX_STRING, async () => {
    getIpLookupData(MOCKUP_HOST_ARRAY, (err, ipLookupDataArray) => {
      if (err) return console.error(`${new Date()} | Error: ${err}`);
      if (!ipLookupDataArray) return console.error(`${new Date()} | empty_ipLookupDataArray`); 

      async.timesSeries(ipLookupDataArray.length, (i, next) => {
        const eachIpLookupResult = ipLookupDataArray[i];
        const { ipAddress, hostname, latency, cache, region, country, city, loc, postal, org, nodePubkey, votingPower } = eachIpLookupResult;

        CacheServer.saveIpAddressCacheServer({ ipAddress: ipAddress, cacheServerName: cache }, (err: string, cacheServer: CacheServerInterface) => {
          if (err) return console.error(`${new Date()} | Error: ${err}`); 
          HostName.saveIpAddressHostName({ ipAddress: ipAddress, hostName: hostname }, (err: string, hostName: HostNameInterface) => {
            if (err) return console.error(`${new Date()} | Error: ${err}`); 
            HostingService.saveIpAddressHostingService({ ipAddress: ipAddress, hostingServiceName: org }, (err: string, hostingService: HostingServiceInterface) => {
              if (err) return console.error(`${new Date()} | Error: ${err}`); 
              Location.saveIpAddressLocation({ ipAddress: ipAddress, region: region, country: country, city: city, loc: loc, postal: postal }, (err: string, location: LocationInterface) => {
                if (err) return console.error(`${new Date()} | Error: ${err}`); 
                NodeDataLog.createNodeDataLog({ nodePubkey: nodePubkey, latency: latency, votingPower: votingPower }, (err: string, nodeDataLog: NodeDataLogInterface) => {
                  if (err) return console.error(`${new Date()} | Error: ${err}`); 
                })
              })
            })
          })
        })
      })
    })
  });
}
