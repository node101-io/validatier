import { cookies as getCookies } from "next/headers";
import PageWrapper from "@/components/page-wrapper/page-wrapper";
import { connectMongoose } from "@/lib/mongoose";
import Cache, { FormattedCacheData } from "../../../src/models/Cache/Cache";
import Chain, { ChainInterface } from "../../../src/models/Chain/Chain";

const getDefaultDates = () => {
  const today = new Date();
  const lastYear = new Date(today);
  lastYear.setMonth(today.getMonth() - 12);
  return { start: lastYear, end: today };
};

export default async function Home() {
  await connectMongoose();

  const cookies = await getCookies();

  const bottomCookie = cookies.get("selectedDateBottom")?.value;
  const topCookie = cookies.get("selectedDateTop")?.value;
  const specificRangeCookie = cookies.get("specificRange")?.value;

  const defaultDates = getDefaultDates();
  const initialStartDate = bottomCookie
    ? new Date(bottomCookie)
    : defaultDates.start;
  const initialEndDate = topCookie ? new Date(topCookie) : defaultDates.end;
  const initialInterval = specificRangeCookie || "last_365_days";

  const bottomTimestamp = initialStartDate.getTime();
  const topTimestamp = initialEndDate.getTime();

  const [chains, formattedData] = await Promise.all([
    new Promise<ChainInterface[]>((resolve) => {
      Chain.getAllChains((err, chains) => {
        if (err || !chains) throw new Error(err ?? "unknown_error");

        resolve(chains);
      });
    }),
    new Promise<FormattedCacheData>((resolve) => {
      Cache.getFormattedCacheForChain(
        {
          chain_identifier: "cosmoshub",
          interval: specificRangeCookie || "last_365_days",
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp,
        },
        (err, formattedData) => {
          if (err || !formattedData) throw new Error(err ?? "unknown_error");

          resolve(formattedData);
        }
      );
    }),
  ]);

  return (
    <PageWrapper
      validators={formattedData.validators}
      summaryData={formattedData.summaryData}
      price={
        chains.find((chain) => chain.name === "cosmoshub")?.usd_exchange_rate ??
        0
      }
      metrics={formattedData.metrics}
      delegationData={formattedData.delegationData}
      soldData={formattedData.soldData}
      priceData={formattedData.priceData}
      smallSelfStakeAmountGraphData={
        formattedData.smallSelfStakeAmountGraphData
      }
      smallSelfStakeRatioGraphData={formattedData.smallSelfStakeRatioGraphData}
      initialStartDate={initialStartDate}
      initialEndDate={initialEndDate}
      initialInterval={initialInterval}
    />
  );
}
