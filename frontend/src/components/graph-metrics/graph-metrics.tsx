"use client";

import MetricContent from "../metric-content/metric-content";
import type Metric from "@/types/metric";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import { computeYAxisMax } from "@/utils/chart-axis";

const Chart = lazy(() => import("react-apexcharts"));

const labelColor = "#7E77B8";
const gridColor = "#C9C4EE55";
const yLabelMinMaxWidth = 64; // ensure identical left gutter across charts

// Format ATOM amounts dynamically based on value
const formatAtomAmount = (value: number): string => {
  if (value === 0) return "0.00";

  const absValue = Math.abs(value);

  // Already in millions from backend
  if (absValue >= 1) {
    return `${value.toFixed(2)}M`;
  } else if (absValue >= 0.001) {
    // Convert to K (thousands)
    return `${(value * 1000).toFixed(2)}K`;
  } else {
    // Show as is (small values)
    return `${(value * 1_000_000).toFixed(0)}`;
  }
};

const baseOptions = (id: string): ApexOptions => ({
  chart: {
    id,
    // deliberately NOT setting `group` here — ApexCharts' cross-chart
    // sync-group feature has a known first-mount race when several grouped
    // charts render in the same React commit (which is exactly what our 3
    // mini-charts do, sharing one lazy-loaded Chart component under one
    // Suspense boundary): on some page loads one chart's axis/series bleed
    // into the others until something forces a remount (e.g. a refresh).
    // Losing the synced hover-tooltip across the 3 charts is an acceptable
    // trade for never rendering wrong data.
    type: "area",
    toolbar: { show: false },
    animations: { enabled: true },
    foreColor: labelColor,
    parentHeightOffset: 0,
    sparkline: { enabled: false },
    fontFamily: "Darker Grotesque, sans-serif",
    zoom: { enabled: false },
  },
  stroke: { curve: "smooth", width: 3 },
  dataLabels: {
    enabled: false,
    style: { fontFamily: "Darker Grotesque, sans-serif" },
  },
  markers: { size: 0 },
  colors: ["#5856D7"],
  grid: {
    show: true,
    borderColor: gridColor,
    strokeDashArray: 0,
    yaxis: { lines: { show: true } },
    xaxis: { lines: { show: true } },
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
  },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: {
        colors: labelColor,
        fontFamily: "Darker Grotesque, sans-serif",
        fontSize: "14px",
      },
    },
    tooltip: { enabled: false },
  },
  yaxis: [
    {
      labels: {
        minWidth: yLabelMinMaxWidth,
        maxWidth: yLabelMinMaxWidth,
        offsetX: 0,
        style: {
          fontFamily: "Darker Grotesque, sans-serif",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
  ],
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 0,
      opacityFrom: 0.8,
      opacityTo: 0.1,
      stops: [0, 100],
      gradientToColors: ["#FF6B6B"], // Yukarıdan aşağıya gradient için ikinci renk
      type: "vertical", // Yukarıdan aşağıya gradient
    },
  },
  plotOptions: {
    area: {
      fillTo: "end",
    },
  },
  legend: { show: false },
  tooltip: {
    enabled: true,
    shared: true,
    intersect: false,
    followCursor: false,
    theme: "light",
    x: { show: true },
    marker: { show: true },
    style: { fontFamily: "Darker Grotesque, sans-serif" },
    fixed: {
      enabled: true,
      position: "topRight",
      offsetX: 0,
      offsetY: -18,
    },
  },
});

const optionsDelegation = {
  ...baseOptions("ns-shared"),
  colors: ["#FF9404"],
  chart: {
    ...baseOptions("ns-shared").chart,
    id: "chart-delegation",
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 0,
      opacityFrom: 0.6,
      opacityTo: 0.1,
      stops: [0, 100],
      gradientToColors: ["#FFB84D"], // Orange gradient
      type: "vertical",
    },
  },
  grid: {
    ...baseOptions("ns-shared").grid,
    padding: { left: 0, right: 0, top: -2, bottom: 0 },
  },
  yaxis: [
    {
      min: 0,
      max: 500_000_000,
      tickAmount: 2,
      forceNiceScale: false,
      labels: {
        formatter: (v: number) => formatAtomAmount(v / 1_000_000),
        style: { colors: [labelColor] },
        minWidth: yLabelMinMaxWidth,
        maxWidth: yLabelMinMaxWidth,
        offsetX: -8,
      },
    },
  ],
  xaxis: { ...baseOptions("ns-shared").xaxis, labels: { show: false } },
  tooltip: {
    ...baseOptions("ns-shared").tooltip,
    y: {
      formatter: (v: number) => `${formatAtomAmount(v / 1_000_000)} ATOM`,
      title: { formatter: () => "Average Delegation:" },
    },
  },
};

const optionsSold = {
  ...baseOptions("ns-shared"),
  colors: ["#5856D7"],
  chart: {
    ...baseOptions("ns-shared").chart,
    id: "chart-sold",
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 0,
      opacityFrom: 0.6,
      opacityTo: 0.1,
      stops: [0, 100],
      gradientToColors: ["#8B7ED8"], // Purple gradient
      type: "vertical",
    },
  },
  grid: {
    ...baseOptions("ns-shared").grid,
    padding: { left: 0, right: 0, top: -2, bottom: 0 },
  },
  yaxis: [
    {
      min: 0,
      max: 20_000_000,
      tickAmount: 3,
      labels: {
        formatter: (v: number) => formatAtomAmount(v / 1_000_000),
        style: { colors: [labelColor] },
        minWidth: yLabelMinMaxWidth,
        maxWidth: yLabelMinMaxWidth,
        offsetX: -8,
      },
    },
  ],
  xaxis: { ...baseOptions("ns-shared").xaxis, labels: { show: false } },
  tooltip: {
    ...baseOptions("ns-shared").tooltip,
    y: {
      formatter: (v: number) => `${formatAtomAmount(v / 1_000_000)} ATOM`,
      title: { formatter: () => "Total Sold Amount:" },
    },
  },
};

const optionsPrice = {
  ...baseOptions("ns-shared"),
  colors: ["#31ADE6"],
  chart: {
    ...baseOptions("ns-shared").chart,
    id: "chart-price",
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 0,
      opacityFrom: 0.6,
      opacityTo: 0.1,
      stops: [0, 100],
      gradientToColors: ["#5BC0EB"], // Blue gradient
      type: "vertical",
    },
  },
  grid: {
    ...baseOptions("ns-shared").grid,
    padding: { left: 0, right: 0, top: -2, bottom: 16 },
  },
  xaxis: { ...baseOptions("ns-shared").xaxis, labels: { show: false } },
  yaxis: [
    {
      min: 0,
      max: 10,
      tickAmount: 3,
      labels: {
        formatter: (v: number) => `$${v.toFixed(0)}`,
        style: {
          colors: [labelColor],
        },
        minWidth: yLabelMinMaxWidth,
        maxWidth: yLabelMinMaxWidth,
        offsetX: -8,
      },
    },
  ],
  tooltip: {
    ...baseOptions("ns-shared").tooltip,
    y: {
      formatter: (v: number) => `$${v.toFixed(2)}`,
      title: { formatter: () => "ATOM Price:" },
    },
  },
};

export default function GraphMetrics({
  metrics,
  firstSeries,
  secondSeries,
  thirdSeries,
  timestamps,
  price,
}: {
  metrics: Metric[];
  firstSeries: ApexOptions["series"];
  secondSeries: ApexOptions["series"];
  thirdSeries: ApexOptions["series"];
  timestamps: number[]; // unix sec, one per data point, same order/length as the series above
  price: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // x-axis labels come straight from the export's own timestamps (docs/05) —
  // no cookie/date-range derivation anymore (all_time only, no filtering).
  const dynamicCategories = useMemo(() => {
    if (timestamps.length === 0) return [] as string[];
    const spanMs = (timestamps[timestamps.length - 1] - timestamps[0]) * 1000;
    const spanDays = spanMs / (1000 * 60 * 60 * 24);
    return timestamps.map((ts) => {
      const d = new Date(ts * 1000);
      return spanDays > 400
        ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    });
  }, [timestamps]);
  const delegationMax = useMemo(
    () =>
      computeYAxisMax(
        firstSeries as Array<{ data: number[] }>,
        0.1,
        500_000_000
      ),
    [firstSeries]
  );
  const soldMax = useMemo(
    () =>
      computeYAxisMax(
        secondSeries as Array<{ data: number[] }>,
        0.1,
        20_000_000
      ),
    [secondSeries]
  );
  const priceMax = useMemo(
    () => computeYAxisMax(thirdSeries as Array<{ data: number[] }>, 0.1, 10),
    [thirdSeries]
  );

  // Create a stable group id per selected date range to avoid cross-range sync artifacts
  const chartGroupId = useMemo(() => {
    return `ns-shared-${dynamicCategories.length}`;
  }, [dynamicCategories]);

  // Normalize series data to have the same length
  const normalizedFirstSeries = useMemo(() => {
    if (!firstSeries?.[0] || typeof firstSeries[0] === "number")
      return firstSeries;
    const maxLen = dynamicCategories.length;
    const currentLen = firstSeries[0].data.length;
    if (currentLen >= maxLen) return firstSeries;
    const paddedData = [...firstSeries[0].data];
    while (paddedData.length < maxLen) paddedData.push(null);
    return [{ ...firstSeries[0], data: paddedData }] as ApexOptions["series"];
  }, [firstSeries, dynamicCategories.length]);

  const normalizedSecondSeries = useMemo(() => {
    if (!secondSeries?.[0] || typeof secondSeries[0] === "number")
      return secondSeries;
    const maxLen = dynamicCategories.length;
    const currentLen = secondSeries[0].data.length;
    if (currentLen >= maxLen) return secondSeries;
    const paddedData = [...secondSeries[0].data];
    while (paddedData.length < maxLen) paddedData.push(null);
    return [{ ...secondSeries[0], data: paddedData }] as ApexOptions["series"];
  }, [secondSeries, dynamicCategories.length]);

  const normalizedThirdSeries = useMemo(() => {
    if (!thirdSeries?.[0] || typeof thirdSeries[0] === "number")
      return thirdSeries;
    const maxLen = dynamicCategories.length;
    const currentLen = thirdSeries[0].data.length;
    if (currentLen >= maxLen) return thirdSeries;
    const paddedData = [...thirdSeries[0].data];
    while (paddedData.length < maxLen) paddedData.push(null);
    return [{ ...thirdSeries[0], data: paddedData }] as ApexOptions["series"];
  }, [thirdSeries, dynamicCategories.length]);

  const optionsDelegationDynamic = useMemo(
    () => ({
      ...optionsDelegation,
      chart: {
        ...optionsDelegation.chart,
      },
      xaxis: {
        ...optionsDelegation.xaxis,
        categories: dynamicCategories,
        tickAmount: dynamicCategories.length,
      },
      yaxis: [
        {
          ...optionsDelegation.yaxis[0],
          max: delegationMax,
        },
      ],
    }),
    [delegationMax, dynamicCategories, chartGroupId]
  );

  const optionsSoldDynamic = useMemo(
    () => ({
      ...optionsSold,
      chart: {
        ...optionsSold.chart,
      },
      xaxis: {
        ...optionsSold.xaxis,
        categories: dynamicCategories,
        tickAmount: dynamicCategories.length,
      },
      yaxis: [
        {
          ...optionsSold.yaxis[0],
          max: soldMax,
        },
      ],
    }),
    [soldMax, dynamicCategories, chartGroupId]
  );

  const optionsPriceDynamic = useMemo(
    () => ({
      ...optionsPrice,
      chart: {
        ...optionsPrice.chart,
      },
      xaxis: {
        ...optionsPrice.xaxis,
        categories: dynamicCategories,
        tickAmount: dynamicCategories.length,
      },
      yaxis: [
        {
          ...optionsPrice.yaxis[0],
          max: priceMax,
        },
      ],
    }),
    [priceMax, dynamicCategories, chartGroupId]
  );

  const footerAxisLabels = useMemo(() => {
    const n = dynamicCategories.length;
    if (n === 0) return [] as string[];
    if (n <= 5) return dynamicCategories;
    const result: string[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const idx = Math.round((i * (n - 1)) / steps);
      result.push(dynamicCategories[idx]);
    }
    return result;
  }, [dynamicCategories]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="w-fit my-2 text-xl font-[500] text-[#7c70c3] px-5 lg:px-0">
        Graph Metrics
      </div>
      <div className="flex gap-5 flex-row h-fit w-full overflow-y-hidden overflow-x-auto no-scrollbar">
        <div className="flex flex-row w-full lg:min-w-[230px] lg:max-w-[230px] gap-3 ml-0 p-0">
          <div className="flex flex-row lg:flex-col w-full h-full gap-5 overflow-y-hidden overflow-x-auto no-scrollbar px-5 lg:px-0">
            {metrics.map((metric) => (
              <MetricContent key={metric.id} metric={metric} price={price} />
            ))}
          </div>
        </div>
        <div className="hidden lg:flex flex-col w-full p-2 bg-[#f5f5ff] rounded-[20px] border-[0.5px] border-[#bebee7]">
          <div className="flex flex-col items-center py-2 px-4 h-11 w-full">
            <div className="flex items-baseline justify-between w-full">
              <div
                className="text-[28px] font-[500] text-[#250054]"
                id="summary-graph-title"
              >
                Reward Flow Overview
              </div>
            </div>
          </div>
          <div className="w-full" id="network-summary-graph-container">
            <ClientOnly>
              <Suspense fallback={null}>
                <div
                  style={{
                    height: 110,
                    margin: 0,
                    padding: 0,
                    lineHeight: 0,
                    width: "calc(100% - 18px)",
                  }}
                >
                  <Chart
                    type="area"
                    options={optionsDelegationDynamic}
                    series={normalizedFirstSeries}
                    key={`chart-delegation-${chartGroupId}`}
                    height={110}
                  />
                </div>
                <div
                  style={{
                    height: 110,
                    margin: 0,
                    padding: 0,
                    lineHeight: 0,
                    width: "calc(100% - 18px)",
                  }}
                >
                  <Chart
                    type="area"
                    options={optionsSoldDynamic}
                    series={normalizedSecondSeries}
                    key={`chart-sold-${chartGroupId}`}
                    height={110}
                  />
                </div>
                <div
                  style={{
                    height: 130,
                    margin: 0,
                    padding: 0,
                    lineHeight: 0,
                    width: "calc(100% - 18px)",
                  }}
                >
                  <Chart
                    type="area"
                    options={optionsPriceDynamic}
                    series={normalizedThirdSeries}
                    key={`chart-price-${chartGroupId}`}
                    height={130}
                  />
                </div>
              </Suspense>
            </ClientOnly>
          </div>
          {mounted && footerAxisLabels.length > 0 && (
            <div className="flex justify-between h-[28px] py-2 pl-11 text-[14px] text-[#7E77B8] select-none pointer-events-none">
              {footerAxisLabels.map((label, idx) => (
                <span key={`${label}-${idx}`} className="shrink-0">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
