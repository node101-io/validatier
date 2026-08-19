"use client";

import { lazy } from "react";
import NetworkSummary from "@/components/network-summary/network-summary";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import ValidatorLeaderboards from "@/components/validator-leaderboards/validator-leaderboards";
import type Validator from "@/types/validator";
import ValidatorTable from "../validator-table/validator-table";
import type SummaryData from "@/types/summary";
import type Metric from "@/types/metric";
import { formatPercentage, formatAtom, formatAtomUSD } from "@/utils/format-numbers";
import type { ApexOptions } from "apexcharts";

const MiniChart = lazy(() => import("react-apexcharts"));

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
  timestamps,
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
  timestamps: number[];
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
          <NetworkSummary
            leftColumn={
              <>
                <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                  Average Delegation
                </div>
                <div
                  className="text-[28px] font-bold text-[#49306f] leading-3 mb-0.5 text-nowrap"
                  id="summary-average-delegation-native"
                >
                  {formatAtom(summaryData.total_stake_sum / (validators.length || 1))} ATOM
                </div>
                <div
                  className="font-medium text-[20px] text-[#7c70c3]"
                  id="summary-average-delegation-usd"
                >
                  $
                  {formatAtomUSD(
                    summaryData.total_stake_sum / (validators.length || 1),
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
                        name: "Average Delegation",
                        data: delegationData,
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
                  Total Sold Amount
                </div>
                <div
                  className="text-[28px] font-bold text-[#49306f] leading-3 mb-0.5 text-nowrap"
                  id="summary-total-sold-native"
                >
                  {formatAtom(summaryData.total_sold)} ATOM
                </div>
                <div
                  className="font-medium text-[20px] text-[#7c70c3]"
                  id="summary-total-sold-usd"
                >
                  ${formatAtomUSD(summaryData.total_sold, price)}
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
                    colors: ["#FF9404"],
                  }}
                  series={
                    [
                      {
                        name: "Total Sold Amount",
                        data: soldData,
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
        timestamps={timestamps}
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
