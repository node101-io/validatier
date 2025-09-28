"use client";

import NetworkSummary from "@/components/network-summary/network-summary";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import ValidatorLeaderboards from "@/components/validator-leaderboards/validator-leaderboards";
import Validator from "@/types/validator";
import ValidatorTable from "../validator-table/validator-table";
import { ValidatorsSummaryDataInterface } from "../../../../src/models/Validator/Validator";
import Metric from "@/types/metric";
import {
    formatPercentage,
    formatAtom,
    formatAtomUSD,
} from "@/utils/format-numbers";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const MiniChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const miniOptions: ApexOptions = {
    chart: {
        type: "area",
        animations: { enabled: false },
        toolbar: { show: false },
        sparkline: { enabled: true },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        foreColor: "#7E77B8",
        fontFamily: "Darker Grotesque, sans-serif",
    },
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    markers: { size: 0 },
    grid: { show: false },
    xaxis: {
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
    },
    yaxis: { show: false },
    tooltip: { enabled: false },
    fill: {
        type: "gradient",
        gradient: {
            shadeIntensity: 0,
            opacityFrom: 0.18,
            opacityTo: 0.04,
            stops: [0, 90, 100],
        },
    },
    colors: ["#5856D7"],
};

export default function Inner({
    validators,
    summaryData,
    price,
    metrics,
    delegationData,
    soldData,
    priceData,
    smallSelfStakeAmountGraphData,
    smallSelfStakeRatioGraphData,
}: {
    validators: Validator[];
    summaryData: ValidatorsSummaryDataInterface;
    price: number;
    metrics: Metric[];
    delegationData: number[];
    soldData: number[];
    priceData: number[];
    smallSelfStakeAmountGraphData: number[];
    smallSelfStakeRatioGraphData: number[];
}) {
    return (
        <div
            className="flex flex-col w-full lg:w-[1100px] gap-5 h-fit py-0 lg:px-10 mt-37.5 mb-1"
            id="inner-main-wrapper"
        >
            <div
                className="flex flex-col w-full gap-5 mb-2.5"
                id="network-summary-main-wrapper"
            >
                <div className="text-xl font-normal text-[#7c70c3] px-5 lg:px-0">
                    Network Summary
                </div>
                <div className="flex flex-row flex-nowrap justify-between gap-5 overflow-y-hidden overflow-x-scroll md:overflow-x-visible no-scrollbar px-5 lg:px-0 ml-0">
                    <NetworkSummary
                        leftColumn={
                            <>
                                <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                                    Self Stake Amount
                                </div>
                                <div
                                    className="text-[28px] font-bold text-[#49306f] leading-3 mb-0.5 text-nowrap"
                                    id="summary-self-stake-amount-native"
                                >
                                    {formatAtom(summaryData.self_stake_sum)}{" "}
                                    ATOM
                                </div>
                                <div
                                    className="font-medium text-[20px] text-[#7c70c3]"
                                    id="summary-self-stake-amount-usd"
                                >
                                    $
                                    {formatAtomUSD(
                                        summaryData.self_stake_sum,
                                        price
                                    )}
                                </div>
                            </>
                        }
                        rightColumn={
                            <div className="flex items-center h-full w-32 justify-end">
                                <MiniChart
                                    type="area"
                                    height={80}
                                    width={80}
                                    options={{
                                        ...miniOptions,
                                        colors: ["#31ADE6"],
                                    }}
                                    series={
                                        [
                                            {
                                                name: "Self Stake Amount",
                                                data: smallSelfStakeAmountGraphData,
                                            },
                                        ] as ApexOptions["series"]
                                    }
                                />
                            </div>
                        }
                    />
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
                                    {formatPercentage(
                                        summaryData.percentage_sold
                                    )}
                                    %
                                </div>
                                <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                            </>
                        }
                        rightColumn={
                            <>
                                <div className="flex w-20 aspect-square border-[0.5px] border-[#bebee7] rounded-full bg-[#e8e8ff] items-center relative text-[16px]">
                                    <span className="my-0 mx-auto mb-1 z-10">
                                        {formatPercentage(
                                            100 - summaryData.percentage_sold
                                        )}
                                        %
                                    </span>
                                    <div
                                        className="flex items-center justify-center relative right-0 aspect-square border-[0.5px] border-[#beebe7] text-[#e5e5ff] bg-[#7c70c3] rounded-full leading-[22px] font-bold text-nowrap"
                                        style={{
                                            width: `max(calc(80px * ${
                                                summaryData.percentage_sold /
                                                100
                                            }), 40%)`,
                                        }}
                                    >
                                        <span className="absolute left-0 mb-1 w-full text-center my-0 mx-auto z-10 font-normal">
                                            {formatPercentage(
                                                summaryData.percentage_sold
                                            )}
                                            %
                                        </span>
                                    </div>
                                </div>
                            </>
                        }
                    />
                    <NetworkSummary
                        leftColumn={
                            <>
                                <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                                    Avg. Self/Total Stake
                                </div>
                                <div
                                    className="text-[36px] leading-[22px] font-bold text-[#49306f] text-nowrap mb-0.5"
                                    id="summary-average-self-stake-ratio-native"
                                >
                                    {formatPercentage(
                                        summaryData.average_self_stake_ratio
                                    )}
                                    %
                                </div>
                                <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                            </>
                        }
                        rightColumn={
                            <div className="flex items-center h-full w-32 justify-end">
                                <MiniChart
                                    type="area"
                                    height={80}
                                    width={80}
                                    options={{
                                        ...miniOptions,
                                        colors: ["#FF9404"],
                                    }}
                                    series={
                                        [
                                            {
                                                name: "Avg Self/Total Stake",
                                                data: smallSelfStakeRatioGraphData,
                                            },
                                        ] as ApexOptions["series"]
                                    }
                                />
                            </div>
                        }
                    />
                </div>
            </div>
            <GraphMetrics
                firstSeries={[
                    {
                        name: "Average Delegation",
                        data: delegationData,
                    },
                ]}
                secondSeries={[
                    {
                        name: "Total Sold Amount",
                        data: soldData,
                    },
                ]}
                thirdSeries={[
                    {
                        name: "ATOM Price",
                        data: priceData,
                    },
                ]}
                metrics={metrics}
            />
            <ValidatorLeaderboards
                validators={validators.slice(0, 10)}
                percentageSold={summaryData.percentage_sold}
                totalSold={summaryData.total_sold}
                price={price}
            />
            <ValidatorTable validators={validators} />
        </div>
    );
}
