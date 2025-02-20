
import async from "async";
import ping from "ping";
import { getCacheServerNameFromHeaders } from "../../utils/getCacheServerNameFromHeaders.js";

export const getIpLookupData = (ipAddresses: string[]) => {
  
  async.timesSeries(ipAddresses.length, async (i: number): Promise<void> => {

    const eachIpAddress = ipAddresses[i];

    const request = await fetch(`https://ipinfo.io/${eachIpAddress}/json?token=${process.env.IP_LOOKUP_API_KEY}`);
    const ipLookupJsonResponse = await request.json();
    console.log(ipLookupJsonResponse)

    const pingRes = await ping.promise.probe(eachIpAddress);
    const latency = pingRes.time;

    fetch("http://" + eachIpAddress)
      .then(async (response) => {

        getCacheServerNameFromHeaders(response.headers, (err, cacheServerName) => {
          if (err) return console.log(err);

          const dataLogRecordToSave = {
            timestamp: Date.now(),
            ipAddress: ipLookupJsonResponse.ip,
            nodePubkey: "merabe",
            hostname: ipLookupJsonResponse.hostname,
            latency: latency,
            cache: cacheServerName,
            region: ipLookupJsonResponse.region,
            country: ipLookupJsonResponse.country,
            city: ipLookupJsonResponse.city,
            loc: ipLookupJsonResponse.loc,
            postal: ipLookupJsonResponse.postal,
            org: ipLookupJsonResponse.org
          }


          console.log(dataLogRecordToSave)
        });
        
      })
      .catch(err => console.error("err"));

  })
}
