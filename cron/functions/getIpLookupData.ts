
import async from "async";
import ping from "ping";
import { getCacheServerNameFromHeaders } from "../../utils/getCacheServerNameFromHeaders.js";
import { getValidatorVotingPower } from "./fetchValidators.js";

interface IpLookupInterface {
  nodePubkey: string,
  ipAddress: string;
  hostname: string;
  latency: number | unknown;
  votingPower: string;
  cache: string;
  region: string;
  country: string;
  city: string;
  loc: string;
  postal: string;
  org: string;
}

interface HostsInterface {
  ipAddress: string;
  nodePubkey: string;
}

export const getIpLookupData = (hosts: HostsInterface[], callback: (err: string, ipLookupDataArray: IpLookupInterface[] | null) => any) => {
  
  const ipLookupDataArray: IpLookupInterface[] = [];

  async.timesSeries(hosts.length, async (i: number): Promise<void> => {

    const nodePubkey = hosts[i].nodePubkey;
    const eachIpAddress = hosts[i].ipAddress;

    const request = await fetch(`https://ipinfo.io/${eachIpAddress}/json?token=${process.env.IP_LOOKUP_API_KEY}`);
    const ipLookupJsonResponse = await request.json();
    console.log(ipLookupJsonResponse)

    const pingRes = await ping.promise.probe(eachIpAddress);
    const latency: Number | unknown = pingRes.time;

    fetch("http://" + eachIpAddress)
      .then(async (response) => {

        getCacheServerNameFromHeaders(response.headers, (err, cacheServerName) => {
          if (err) return console.log(err);

          getValidatorVotingPower(nodePubkey, (err, votingPower) => {
            if (err) return console.log(err);

            const dataLogRecordToSave: IpLookupInterface = {
              nodePubkey: nodePubkey,
              ipAddress: ipLookupJsonResponse.ip,
              hostname: ipLookupJsonResponse.hostname,
              latency: latency,
              votingPower: votingPower,
              cache: cacheServerName,
              region: ipLookupJsonResponse.region,
              country: ipLookupJsonResponse.country,
              city: ipLookupJsonResponse.city,
              loc: ipLookupJsonResponse.loc,
              postal: ipLookupJsonResponse.postal,
              org: ipLookupJsonResponse.org
            }

            ipLookupDataArray.push(dataLogRecordToSave);
          })
        });
      })
      .catch(err => callback(err, null));
  }, (err) => {
    if (err) return callback("", null);
    return callback("", ipLookupDataArray);
  })
}
