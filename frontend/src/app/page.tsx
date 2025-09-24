import { cookies as getCookies } from "next/headers";
import ScrollProvider from "@/components/scroll/scroll-provider";
import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import Validator from "@/types/validator";
import { connectMongoose } from "@/lib/mongoose";
import Cache, { CacheInterface } from "../../../src/models/Cache/Cache";
import Chain, { ChainInterface } from "../../../src/models/Chain/Chain";
import { formatAtom, formatAtomUSD } from "@/utils/format-numbers";

const validators: Validator[] = [
    {
        id: "1",
        name: "Validator 1 asd asd ad asdadasdasdas asd as",
        operatorAddress: "validator1ewqeqweqweqw",
        image: "https://via.placeholder.com/150",
        totalSold: 100,
        percentageSold: 85,
        avgDelegation: 12500,
        totalRewards: 45000,
        selfStake: 32000,
    },
    {
        id: "2",
        name: "Validator 2",
        operatorAddress: "validator2",
        image: "https://via.placeholder.com/150",
        totalSold: 95,
        percentageSold: 72,
        avgDelegation: 9800,
        totalRewards: 30000,
        selfStake: 15000,
    },
    {
        id: "3",
        name: "Validator 3",
        operatorAddress: "validator3",
        image: "https://via.placeholder.com/150",
        totalSold: 90,
        percentageSold: 68,
        avgDelegation: 7600,
        totalRewards: 28000,
        selfStake: 12000,
    },
    {
        id: "4",
        name: "Validator 4",
        operatorAddress: "validator4",
        image: "https://via.placeholder.com/150",
        totalSold: 85,
        percentageSold: 55,
        avgDelegation: 5400,
        totalRewards: 21000,
        selfStake: 9000,
    },
    {
        id: "5",
        name: "Validator 5",
        operatorAddress: "validator5",
        image: "https://via.placeholder.com/150",
        totalSold: 80,
        percentageSold: 42,
        avgDelegation: 4200,
        totalRewards: 15000,
        selfStake: 7000,
    },
];

export default async function Home() {
    await connectMongoose();

    const cookies = await getCookies();

    const bottomCookie = cookies.get("selectedDateBottom")?.value;
    const topCookie = cookies.get("selectedDateTop")?.value;
    const specificRangeCookie = cookies.get("specificRange")?.value;

    const bottomTimestamp = bottomCookie
        ? new Date(bottomCookie).getTime()
        : new Date(
              `${new Date().getUTCFullYear() - 1}-${
                  new Date().getUTCMonth() + 1
              }-${new Date().getUTCDate()}`
          ).getTime();

    const topTimestamp = topCookie ? new Date(topCookie).getTime() : Date.now();

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
                if (err || !cacheResult)
                    throw new Error(err ?? "unknown_error");

                resolve(cacheResult[0]);
            }
        );
    });

    const cummulativeActiveListData = new Map<string, boolean>();

    for (const each of cacheResult.cummulative_active_list)
        if (
            Math.abs(topTimestamp - bottomTimestamp) / 86400000 / 90 <=
            each.count
        )
            cummulativeActiveListData.set(each._id, true);

    const price =
        chains.find((chain) => chain.name === "cosmoshub")?.usd_exchange_rate ??
        0;

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

    return (
        <ScrollProvider className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-scroll ml-0 h-screen rounded-0 bg-white transition-all duration-250">
            <Navbar />
            <Intro />
            <Inner
                validators={validators} // TODO: change to cacheResult.validators
                summaryData={cacheResult.summary_data}
                price={price}
                metrics={[
                    {
                        id: "total_stake_sum",
                        color: "#FF9404",
                        title: "Average Delegation",
                        valueNative: formatAtom(averageDelegation, 1) + " ATOM",
                        valueUsd:
                            "$" + formatAtomUSD(averageDelegation, price, 1),
                    },
                    {
                        id: "total_sold",
                        color: "#5856D7",
                        title: "Total Sold Amount",
                        valueNative: formatAtom(totalSoldAmount, 1) + " ATOM",
                        valueUsd:
                            "$" + formatAtomUSD(totalSoldAmount, price, 1),
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
            />
            <StakeWithUs />
            <Footer />
        </ScrollProvider>
    );
}
