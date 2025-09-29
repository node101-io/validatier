import Navbar from "@/components/navbar/navbar";
import Validator, {
    ValidatorWithMetricsInterface,
    SingleValidatorGraphDataInterface,
} from "../../../../../src/models/Validator/Validator";
import Price from "../../../../../src/models/Price/Price";
import NetworkSummary from "@/components/network-summary/network-summary";
import {
    formatAtom,
    formatAtomUSD,
    formatPercentage,
} from "@/utils/format-numbers";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import truncateAddress from "@/utils/truncate-address";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import { connectMongoose } from "@/lib/mongoose";
import { cookies as getCookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ValidatorPage({
    params,
}: {
    params: Promise<{ operatorAddress: string }>;
}) {
    await connectMongoose();

    const operatorAddress = (await params).operatorAddress;

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

    const validator = await new Promise<ValidatorWithMetricsInterface | null>(
        (resolve) => {
            Validator.getValidatorByOperatorAddress(
                {
                    operator_address: operatorAddress,
                },
                (err, validator) => {
                    if (err) throw new Error(err);
                    resolve(validator);
                }
            );
        }
    );

    const pricaData = await new Promise<number[]>((resolve) => {
        Price.getPriceGraphData(
            {
                bottom_timestamp: bottomTimestamp,
                top_timestamp: topTimestamp,
            },
            (err, priceData) => {
                if (err || !priceData) throw new Error(err ?? "unknown_error");

                resolve(priceData);
            }
        );
    });

    const validatorGraphData =
        await new Promise<SingleValidatorGraphDataInterface>((resolve) => {
            Validator.getValidatorGraphData(
                {
                    operator_address: operatorAddress,
                    bottom_timestamp: bottomTimestamp,
                    top_timestamp: topTimestamp,
                    number_of_columns: 90,
                },
                (err, data) => {
                    if (err || !data) throw new Error(err ?? "unknown_error");
                    resolve(data);
                }
            );
        });

    if (!validator) return redirect("/");

    // Compute validator-level metrics similar to home page cards
    const averageDelegation = validator.average_total_stake ?? 0;
    const totalSoldAmount = validator.sold ?? 0;
    const averagePrice =
        pricaData.reduce((acc, each) => acc + each, 0) /
        (pricaData.length || 1);

    return (
        <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
            <div className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-scroll ml-0 h-screen rounded-0 bg-white transition-all duration-250">
                <Navbar isValidatorPage={true} />
                <div className="mt-19 w-full lg:w-[1100px] h-fit lg:px-10">
                    <div className="flex flex-col w-full gap-5 mt-5">
                        <div className="px-5 lg:px-0">
                            <div className="flex flex-col gap-5 sm:gap-0 sm:flex-row items-center justify-between w-full rounded-3xl px-6 py-7.5 border-[0.5px] border-[#bebee7] bg-[#f5f5ff]">
                                {/* Validator Info */}
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src={validator.temporary_image_uri}
                                        alt={validator.moniker}
                                        className="w-10 h-10 rounded-full"
                                    />
                                    <div>
                                        <div className="text-xl font-semibold text-[#250054]">
                                            {validator.moniker}
                                        </div>
                                        <div className="flex flex-row items-center cursor-pointer gap-1">
                                            <span className="text-xl font-base text-[#250054]">
                                                {truncateAddress(
                                                    validator.operator_address
                                                )}
                                            </span>
                                            <img
                                                src="/res/images/clipboard.svg"
                                                alt="copy"
                                                className="w-3 h-3 self-end mb-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5 text-base">
                                    <a
                                        href=""
                                        className="flex items-center gap-1"
                                    >
                                        <img
                                            src="/res/images/web.svg"
                                            alt="website"
                                            className="w-3 h-3 overflow-clip"
                                        />
                                        <span className="mb-1">Website</span>
                                    </a>
                                    <a
                                        href=""
                                        className="flex items-center gap-1"
                                    >
                                        <span className="mb-1">Explorer</span>
                                    </a>
                                    <a className="flex items-center justify-center h-6 gap-1 rounded-xl px-2.5 bg-[#250054] !text-white cursor-pointer">
                                        <span className="mb-1">Stake</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row flex-nowrap justify-start gap-5 overflow-y-hidden ml-0 p-0 px-5 lg:px-0">
                            {/* Network Summary */}
                            <div className="shrink-0">
                                <NetworkSummary
                                    leftColumn={
                                        <>
                                            <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                                                Self Stake
                                            </div>
                                            <div
                                                className="text-[28px] font-bold text-[#49306f] leading-3 mb-0.5 text-nowrap"
                                                id="summary-self-stake-amount-native"
                                            >
                                                {validator.self_stake
                                                    ? `${formatAtom(
                                                          validator.self_stake
                                                      )} ATOM`
                                                    : "- ATOM"}
                                            </div>
                                            <div
                                                className="font-medium text-[20px] text-[#7c70c3]"
                                                id="summary-self-stake-amount-usd"
                                            >
                                                {validator.self_stake
                                                    ? `$${formatAtomUSD(
                                                          validator.self_stake
                                                      )}`
                                                    : "-"}
                                            </div>
                                        </>
                                    }
                                    rightColumn={
                                        <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                                            7th out of 215
                                        </div>
                                    }
                                />
                            </div>
                            <div className="shrink-0">
                                <NetworkSummary
                                    leftColumn={
                                        <>
                                            <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                                                Percentage sold
                                            </div>
                                            <div
                                                className="text-[36px] leading-[22px] font-bold text-[#49306f] text-nowrap mb-0.5"
                                                id="summary-percentage-sold-native"
                                            >
                                                {validator.percentage_sold
                                                    ? `${formatPercentage(
                                                          validator.percentage_sold,
                                                          1
                                                      )}%`
                                                    : "-"}
                                            </div>
                                            <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                                        </>
                                    }
                                    rightColumn={
                                        <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                                            1st out of 215
                                        </div>
                                    }
                                />
                            </div>
                            <div className="shrink-0">
                                <NetworkSummary
                                    leftColumn={
                                        <>
                                            <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                                                Commission
                                            </div>
                                            <div
                                                className="text-[36px] leading-[22px] font-bold text-[#49306f] text-nowrap mb-0.5"
                                                id="summary-average-self-stake-ratio-native"
                                            >
                                                {validator.commission
                                                    ? `${formatPercentage(
                                                          validator.commission,
                                                          1
                                                      )}%`
                                                    : "-"}
                                            </div>
                                            <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                                        </>
                                    }
                                    rightColumn={
                                        <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                                            Fee from rewards
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                        <GraphMetrics
                            metrics={[
                                {
                                    id: "total_stake_sum",
                                    color: "#FF9404",
                                    title: "Average Delegation",
                                    valueNative: `${formatAtom(
                                        averageDelegation,
                                        1
                                    )} ATOM`,
                                    valueUsd: `$${formatAtomUSD(
                                        averageDelegation,
                                        1
                                    )}`,
                                },
                                {
                                    id: "total_sold",
                                    color: "#5856D7",
                                    title: "Total Sold Amount",
                                    valueNative: `${formatAtom(
                                        totalSoldAmount,
                                        1
                                    )} ATOM`,
                                    valueUsd: `$${formatAtomUSD(
                                        totalSoldAmount,
                                        1
                                    )}`,
                                },
                                {
                                    id: "price",
                                    color: "#31ADE6",
                                    title: "Average ATOM Price",
                                    valueNative: `$${averagePrice.toFixed(2)}`,
                                },
                            ]}
                            firstSeries={[
                                {
                                    name: "Average Delegation",
                                    data: validatorGraphData.total_stake,
                                },
                            ]}
                            secondSeries={[
                                {
                                    name: "Total Sold Amount",
                                    data: validatorGraphData.total_sold,
                                },
                            ]}
                            thirdSeries={[
                                {
                                    name: "ATOM Price",
                                    data: pricaData,
                                },
                            ]}
                        />
                    </div>
                </div>
                <StakeWithUs />
                <Footer />
            </div>
        </div>
    );
}
