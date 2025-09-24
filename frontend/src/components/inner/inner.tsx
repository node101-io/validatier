import NetworkSummary from "@/components/network-summary/network-summary";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import ValidatorLeaderboards from "@/components/validator-leaderboards/validator-leaderboards";
import ValidatorTable from "../validator-table/validator-table";
import Validator from "@/types/validator";

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

export default function Inner({ validators }: { validators: Validator[] }) {
    return (
        <div
            className="flex flex-col w-full lg:w-[1100px] gap-5 h-fit py-0 lg:px-10 mt-37.5 mb-1"
            id="inner-main-wrapper"
        >
            <div
                className="flex flex-col w-full gap-5 mb-2.5"
                id="network-summary-main-wrapper"
            >
                <div className="text-xl font-normal text-[#7c70c3]">
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
                                    761K ATOM
                                </div>
                                <div
                                    className="font-medium text-[20px] text-[#7c70c3]"
                                    id="summary-self-stake-amount-usd"
                                >
                                    $3.4M
                                </div>
                            </>
                        }
                        rightColumn={<div>TBA</div>}
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
                                    24%
                                </div>
                                <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                            </>
                        }
                        rightColumn={
                            <>
                                <div className="flex w-20 aspect-square border-[0.5px] border-[#bebee7] rounded-full bg-[#e8e8ff] items-center relative text-[16px]">
                                    <span className="my-0 mx-auto mb-1 z-10">
                                        76%
                                    </span>
                                    <div
                                        className="flex items-center justify-center relative right-0 aspect-square border-[0.5px] border-[#beebe7] text-[#e5e5ff] bg-[#7c70c3] rounded-full leading-[22px] font-bold text-nowrap"
                                        style={{
                                            width: "calc(var(--percentage-sold-main-circle-diameter) * 0.47958315233127197)",
                                        }}
                                    >
                                        <span className="absolute left-0 mb-1 w-full text-center my-0 mx-auto z-10 font-normal">
                                            24%
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
                                    5%
                                </div>
                                <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                            </>
                        }
                        rightColumn={<div>TBA</div>}
                    />
                </div>
            </div>
            <GraphMetrics
                firstSeries={seriesDelegation}
                secondSeries={seriesSold}
                thirdSeries={seriesPrice}
            />
            <ValidatorLeaderboards validators={validators} />
            <ValidatorTable validators={validators} />
        </div>
    );
}
