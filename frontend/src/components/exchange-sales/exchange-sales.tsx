"use client";

import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { ApexOptions } from "apexcharts";
import type { SinkBreakdownEntry } from "@/types/data";
import { formatAtom, formatAtomUSD } from "@/utils/format-numbers";

const Chart = lazy(() => import("react-apexcharts"));

// Pastel palette, on-brand with the dashboard's series colors (graph-metrics.tsx:
// #5856D7 purple, #31ADE6 blue, #FF9404 orange) softened + extended to 6 slices.
// "Others" always takes the last, muted slot.
const PALETTE = ["#8B87F0", "#4CD787", "#FFA94D", "#3DDCF0", "#A98BE8", "#5B9BF0"];
const OTHERS_COLOR = "#F49B9B";

const fontFamily = "Darker Grotesque, sans-serif";
const labelColor = "#7E77B8";

// Backend already sends the full sorted breakdown (docs/05: sorted sold desc) —
// collapsing to top 5 + Others is purely a display concern, so it lives here
// rather than growing the API response.
function topNWithOthers(entries: SinkBreakdownEntry[], n: number): SinkBreakdownEntry[] {
  if (entries.length <= n) return entries;
  const top = entries.slice(0, n);
  const othersSold = entries.slice(n).reduce((sum, e) => sum + e.sold, 0);
  return othersSold > 0 ? [...top, { name: "Others", sold: othersSold }] : top;
}

export default function ExchangeSales({
  breakdown = [],
  price,
}: {
  breakdown?: SinkBreakdownEntry[];
  price: number;
}) {
  const entries = topNWithOthers(breakdown, 5);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-2.5 mt-2 w-full">
        <div className="text-xl font-[500] text-[#7c70c3] px-5 lg:px-0">Exchange Sales</div>
        <div className="flex px-5 lg:px-0">
          <div className="flex items-center justify-center w-full h-[220px] p-5 bg-[#f5f5ff] rounded-[20px] border-[0.5px] border-[#bebee7] text-[#7c70c3]">
            No exchange sales recorded yet
          </div>
        </div>
      </div>
    );
  }

  const names = entries.map((e) => e.name);
  const values = entries.map((e) => e.sold);
  const colors = entries.map((e, i) => (e.name === "Others" ? OTHERS_COLOR : PALETTE[i % PALETTE.length]));

  const pieOptions: ApexOptions = {
    chart: {
      id: "chart-exchange-sales-pie",
      type: "pie",
      fontFamily,
      foreColor: labelColor,
      toolbar: { show: false },
    },
    labels: names,
    colors,
    dataLabels: { enabled: false },
    stroke: { width: 1, colors: ["#f5f5ff"] },
    legend: {
      position: "right",
      fontFamily,
      fontSize: "15px",
      labels: { colors: labelColor },
      markers: { size: 6 },
      itemMargin: { vertical: 6 },
    },
    tooltip: {
      style: { fontFamily },
      y: {
        formatter: (v: number) => `${formatAtom(v, 1)} ATOM ($${formatAtomUSD(v, price)})`,
      },
    },
  };

  const barOptions: ApexOptions = {
    chart: {
      id: "chart-exchange-sales-bar",
      type: "bar",
      fontFamily,
      foreColor: labelColor,
      toolbar: { show: false },
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        distributed: true,
        borderRadius: 6,
        columnWidth: "55%",
        dataLabels: { position: "top" },
      },
    },
    colors,
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: { colors: ["#49306f"], fontFamily, fontSize: "14px", fontWeight: 600 },
      formatter: (v: number) => formatAtom(v, 1),
    },
    grid: {
      borderColor: "#C9C4EE55",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: names,
      labels: { style: { colors: labelColor, fontFamily } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: [labelColor] },
        formatter: (v: number) => formatAtom(v, 1),
      },
    },
    legend: { show: false },
    tooltip: {
      style: { fontFamily },
      y: {
        formatter: (v: number) => `${formatAtom(v, 1)} ATOM ($${formatAtomUSD(v, price)})`,
      },
    },
  };

  return (
    <div className="flex flex-col gap-2.5 mt-2 w-full">
      <div className="text-xl font-[500] text-[#7c70c3] px-5 lg:px-0">Exchange Sales</div>
      <div className="flex flex-col md:flex-row flex-nowrap justify-start gap-5 overflow-x-scroll md:overflow-x-visible no-scrollbar px-5 lg:px-0">
        <div className="flex flex-col w-full md:w-1/2 min-w-[320px] p-5 bg-[#f5f5ff] rounded-[20px] border-[0.5px] border-[#bebee7]">
          <div className="text-lg font-normal text-[#7c70c3] mb-2">Sales Distribution</div>
          <div className="flex-1 min-h-[280px]">
            <ClientOnly>
              <Suspense fallback={null}>
                <Chart type="pie" options={pieOptions} series={values} height="100%" />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
        <div className="flex flex-col w-full md:w-1/2 min-w-[320px] p-5 bg-[#f5f5ff] rounded-[20px] border-[0.5px] border-[#bebee7]">
          <div className="text-lg font-normal text-[#7c70c3] mb-2">Sales by Exchange</div>
          <div className="flex-1 min-h-[280px]">
            <ClientOnly>
              <Suspense fallback={null}>
                <Chart
                  type="bar"
                  options={barOptions}
                  series={[{ name: "Sold", data: values }]}
                  height="100%"
                />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  );
}
