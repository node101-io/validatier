import { cookies as getCookies } from "next/headers";
import PageWrapper from "@/components/page-wrapper/page-wrapper";
import Validator from "@/types/validator";
import { connectMongoose } from "@/lib/mongoose";
import Cache, { CacheInterface } from "../../../src/models/Cache/Cache";
import Chain, { ChainInterface } from "../../../src/models/Chain/Chain";
import { formatAtom, formatAtomUSD } from "@/utils/format-numbers";

export default async function Home() {
  await connectMongoose();

  const cookies = await getCookies();

  const bottomCookie = cookies.get("selectedDateBottom")?.value;
  const topCookie = cookies.get("selectedDateTop")?.value;
  const specificRangeCookie = cookies.get("specificRange")?.value;

  // Calculate default dates (last year)
  const getDefaultDates = () => {
    const today = new Date();
    const lastYear = new Date(today);
    lastYear.setMonth(today.getMonth() - 12);
    return { start: lastYear, end: today };
  };

  const defaultDates = getDefaultDates();
  const initialStartDate = bottomCookie
    ? new Date(bottomCookie)
    : defaultDates.start;
  const initialEndDate = topCookie ? new Date(topCookie) : defaultDates.end;
  const initialInterval = specificRangeCookie || "last_365_days";

  const bottomTimestamp = initialStartDate.getTime();
  const topTimestamp = initialEndDate.getTime();

  const chains = await new Promise<ChainInterface[]>((resolve) => {
    Chain.getAllChains((err, chains) => {
      if (err || !chains) throw new Error(err ?? "unknown_error");

      resolve(chains);
    });
  });

  const cacheResult = await new Promise<
    CacheInterface | Omit<CacheInterface, "export">
  >((resolve) => {
    Cache.getCacheForChain(
      {
        chain_identifier: "cosmoshub",
        interval: specificRangeCookie || "last_365_days",
      },
      (err, cacheResult) => {
        if (err || !cacheResult) throw new Error(err ?? "unknown_error");

        resolve(cacheResult[0]);
      }
    );
  });

  const cummulativeActiveListData = new Map<string, boolean>();

  for (const each of cacheResult.cummulative_active_list)
    if (Math.abs(topTimestamp - bottomTimestamp) / 86400000 / 90 <= each.count)
      cummulativeActiveListData.set(each._id, true);

  const price =
    chains.find((chain) => chain.name === "cosmoshub")?.usd_exchange_rate ?? 0;

  const { weightedSum, length } = cacheResult.summary_graph.reduce(
    (acc, each, idx, arr) => {
      const weight = arr.length - idx;
      acc.weightedSum += each.total_stake_sum * weight;
      acc.length = arr.length;
      return acc;
    },
    { weightedSum: 0, length: 0 }
  );

  const averageDelegation =
    cacheResult.summary_data.initial_total_stake_sum + weightedSum / length;
  const totalSoldAmount = cacheResult.summary_graph.reduce(
    (acc, each) => acc + each.total_sold,
    0
  );
  const averagePrice =
    cacheResult.price_graph.reduce((acc, each) => acc + each, 0) /
    cacheResult.price_graph.length;

  const soldData: number[] = [];
  for (let i = 0; i < cacheResult.summary_graph.length; i++)
    soldData.push(
      cacheResult.summary_graph[i].total_sold / 1_000_000 +
        (soldData[i - 1] ?? 0)
    );

  const delegationData: number[] = [
    cacheResult.summary_data.initial_total_stake_sum / 1_000_000,
  ];
  for (let i = 0; i < cacheResult.summary_graph.length; i++)
    delegationData.push(
      cacheResult.summary_graph[i].total_stake_sum / 1_000_000 +
        delegationData[i]
    );

  const smallSelfStakeAmountGraphData = [
    cacheResult.small_graph[0].self_stake_sum,
  ];
  for (let i = 1; i < cacheResult.small_graph.length; i++)
    smallSelfStakeAmountGraphData.push(
      cacheResult.small_graph[i].self_stake_sum +
        smallSelfStakeAmountGraphData[i - 1]
    );

  const smallSelfStakeRatioGraphData = cacheResult.small_graph.map((each) =>
    each.average_self_stake_ratio < 0 ? 0 : each.average_self_stake_ratio
  );

  const validators: Validator[] = cacheResult.validators.map((v, index) => ({
    id: index,
    moniker: v.moniker,
    temporary_image_uri:
      v.temporary_image_uri ?? "/res/images/default_validator_photo.svg",
    operator_address: v.operator_address,
    pubkey: v.pubkey,
    percentage_sold: v.percentage_sold,
    sold: v.sold,
    average_total_stake: v.average_total_stake,
    reward: v.reward,
    self_stake: v.self_stake,
    commission: Number(v.commission_rate) * 100,
    total_withdraw: v.total_withdraw,
  }));

  return (
    <PageWrapper
      validators={validators.filter((eachValidator: Validator) =>
        cummulativeActiveListData.has(eachValidator.pubkey)
      )}
      summaryData={cacheResult.summary_data}
      price={price}
      metrics={[
        {
          id: "total_stake_sum",
          color: "#FF9404",
          title: "Average Delegation",
          valueNative: formatAtom(averageDelegation, 1) + " ATOM",
          valueUsd: "$" + formatAtomUSD(averageDelegation, price, 1),
        },
        {
          id: "total_sold",
          color: "#5856D7",
          title: "Total Sold Amount",
          valueNative: formatAtom(totalSoldAmount, 1) + " ATOM",
          valueUsd: "$" + formatAtomUSD(totalSoldAmount, price, 1),
        },
        {
          id: "price",
          color: "#31ADE6",
          title: "Average ATOM Price",
          valueNative: "$" + averagePrice.toFixed(2),
        },
      ]}
      delegationData={delegationData}
      soldData={soldData}
      priceData={cacheResult.price_graph}
      smallSelfStakeAmountGraphData={smallSelfStakeAmountGraphData}
      smallSelfStakeRatioGraphData={smallSelfStakeRatioGraphData}
      initialStartDate={initialStartDate}
      initialEndDate={initialEndDate}
      initialInterval={initialInterval}
    />
  );
}
