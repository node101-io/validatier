"use client";

import Navbar from "@/components/navbar/navbar";
import Validator from "@/types/validator";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "./loading";
import NetworkSummary from "@/components/network-summary/network-summary";
import atomToUSD from "@/utils/atom-to-usd";
import formatNumber from "@/utils/format-number";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import truncateAddress from "@/utils/truncate-address";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";

const seriesDelegation = [
    {
        name: "Average Delegation",
        data: [182_000_000, 210_000_000, 250_000_000, 265_000_000, 328_000_000],
    },
];
const seriesSold = [
    {
        name: "Total Sold Amount",
        data: [200_000, 2_000_000, 7_000_000, 13_000_000, 18_000_000],
    },
];
const seriesPrice = [{ name: "ATOM Price", data: [3, 5, 4, 6, 7] }];

export default function ValidatorPage() {
    const routeParams = useParams<{ operatorAddress: string }>();
    const operatorAddress = (routeParams?.operatorAddress || "") as string;
    const router = useRouter();
    const [validator, setValidator] = useState<Validator | null>(null);

    useEffect(() => {
        const storedValidator = sessionStorage.getItem(
            `validator_${operatorAddress}`
        );
        if (storedValidator) {
            setValidator(JSON.parse(storedValidator));
        } else {
            router.push("/404");
        }
    }, [operatorAddress, router]);

    if (!validator) {
        return <Loading />;
    }

    return (
        <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
            <div className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-scroll ml-0 h-screen rounded-0 bg-white transition-all duration-250">
                <Navbar isValidatorPage={true} />
                <div className="mt-19 w-full lg:w-[1100px] h-fit lg:px-10">
                    <div className="flex flex-col w-full gap-5 mt-5">
                        <div className="flex flex-col gap-5 sm:gap-0 sm:flex-row items-center justify-between w-full rounded-3xl px-6 py-7.5 border-[0.5px] border-[#bebee7] bg-[#f5f5ff]">
                            {/* Validator Info */}
                            <div className="flex items-center gap-2.5">
                                <img
                                    src={validator.image}
                                    alt={validator.name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <div className="text-xl font-semibold text-[#250054]">
                                        {validator.name}
                                    </div>
                                    <div className="flex flex-row items-center cursor-pointer gap-1">
                                        <span className="text-xl font-base text-[#250054]">
                                            {truncateAddress(
                                                validator.operatorAddress
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
                                <a href="" className="flex items-center gap-1">
                                    <img
                                        src="/res/images/web.svg"
                                        alt="website"
                                        className="w-3 h-3 overflow-clip"
                                    />
                                    <span className="mb-1">Website</span>
                                </a>
                                <a href="" className="flex items-center gap-1">
                                    <span className="mb-1">Explorer</span>
                                </a>
                                <a className="flex items-center justify-center h-6 gap-1 rounded-xl px-2.5 bg-[#250054] !text-white cursor-pointer">
                                    <span className="mb-1">Stake</span>
                                </a>
                            </div>
                        </div>
                        <div className="flex flex-row flex-nowrap justify-start gap-5 overflow-y-hidden overflow-x-auto lg:overflow-x-hidden no-scrollbar ml-0 p-0">
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
                                                {validator.selfStake
                                                    ? `${formatNumber(
                                                          validator.selfStake
                                                      )} ATOM`
                                                    : "- ATOM"}
                                            </div>
                                            <div
                                                className="font-medium text-[20px] text-[#7c70c3]"
                                                id="summary-self-stake-amount-usd"
                                            >
                                                {validator.selfStake &&
                                                validator.selfStake > 0
                                                    ? `$${formatNumber(
                                                          atomToUSD(
                                                              validator.selfStake
                                                          )
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
                                                24%
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
                                                5%
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
                            firstSeries={seriesDelegation}
                            secondSeries={seriesSold}
                            thirdSeries={seriesPrice}
                        />
                    </div>
                </div>
                <StakeWithUs />
                <Footer />
            </div>
        </div>
    );
}
