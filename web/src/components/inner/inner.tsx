"use client";

import NetworkSummary from "@/components/network-summary/network-summary";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import ValidatorLeaderboards from "@/components/validator-leaderboards/validator-leaderboards";
import type Validator from "@/types/validator";
import ValidatorTable from "../validator-table/validator-table";
import type SummaryData from "@/types/summary";
import type Metric from "@/types/metric";
import { formatPercentage } from "@/utils/format-numbers";

export default function Inner({
  validators,
  summaryData,
  price,
  metrics,
  delegationData,
  soldData,
  priceData,
  searchQuery = "",
  ref,
}: {
  validators: Validator[];
  summaryData: SummaryData;
  price: number;
  metrics: Metric[];
  delegationData: number[];
  soldData: number[];
  priceData: number[];
  searchQuery?: string;
  ref?: React.RefObject<HTMLDivElement | null>;
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
        <div className="text-xl font-normal text-[#7c70c3] px-5 lg:px-0 max-sm:!opacity-0">
          Network Summary
        </div>
        <div className="flex flex-row flex-nowrap justify-start gap-5 overflow-y-hidden overflow-x-scroll md:overflow-x-visible no-scrollbar px-5 lg:px-0 ml-0">
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
                  {formatPercentage(summaryData.percentage_sold)}%
                </div>
                <div className="font-medium text-[20px] text-[#7c70c3]"></div>
              </>
            }
            rightColumn={
              <>
                <div className="flex w-20 aspect-square border-[0.5px] border-[#bebee7] rounded-full bg-[#e8e8ff] items-center relative text-[16px]">
                  <span className="my-0 mx-auto px-1 mb-1 z-10">
                    {formatPercentage(100 - summaryData.percentage_sold)}%
                  </span>
                  <div
                    className="flex items-center justify-center relative right-0 aspect-square border-[0.5px] border-[#bebee7] text-[#e5e5ff] bg-[#7c70c3] rounded-full leading-[22px] font-bold overflow-hidden"
                    style={{
                      width: `max(calc(80px * ${
                        summaryData.percentage_sold / 100
                      }), 50%)`,
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center z-10 font-normal leading-none mb-1">
                      {formatPercentage(summaryData.percentage_sold)}%
                    </span>
                  </div>
                </div>
              </>
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
        price={price}
      />
      <ValidatorLeaderboards
        validators={validators}
        percentageSold={summaryData.percentage_sold}
        totalSold={summaryData.total_sold}
        price={price}
      />
      <div ref={ref} className="scroll-m-20">
        <ValidatorTable
          validators={validators}
          searchQuery={searchQuery}
          price={price}
        />
      </div>
    </div>
  );
}
