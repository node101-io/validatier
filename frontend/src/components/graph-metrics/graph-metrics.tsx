"use client";

import MetricContent from "../metric-content/metric-content";
import Metric from "@/types/metric";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const metrics: Metric[] = [
    {
        id: "total_stake_sum",
        color: "#FF9404",
        title: "Average Delegation",
        valueNative: "317.7M ATOM",
        valueUsd: "1433.0M",
    },
    {
        id: "total_sold",
        color: "#5856D7",
        title: "Total Sold Amount",
        valueNative: "14.0M ATOM",
        valueUsd: "62.9M",
    },
    {
        id: "price",
        color: "#31ADE6",
        title: "Average ATOM Price",
        valueNative: "$5.08",
    },
];

const labelColor = "#7E77B8";
const gridColor = "#C9C4EE55";
const yLabelMinMaxWidth = 64; // ensure identical left gutter across charts
const categories = ["Sep ’24", "Oct ’24", "Dec ’24", "Mar ’25", "May ’25"];

const baseOptions = (group: string): any => ({
    chart: {
        id: `${group}`,
        group,
        type: "area",
        toolbar: { show: false },
        animations: { enabled: true },
        foreColor: labelColor,
        parentHeightOffset: 0,
        sparkline: { enabled: false },
        fontFamily: "Darker Grotesque, sans-serif",
        zoom: { enabled: false },
        pan: { enabled: false },
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
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
            style: {
                colors: Array(categories.length).fill(labelColor),
                fontFamily: "Darker Grotesque, sans-serif",
                fontSize: "14px",
            },
        },
        tooltip: { enabled: false },
        tickAmount: categories.length,
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
            opacityFrom: 0.15,
            opacityTo: 0.02,
            stops: [0, 90, 100],
        },
    },
    legend: { show: false },
    tooltip: {
        enabled: true,
        shared: false,
        intersect: false,
        followCursor: true,
        theme: "light",
        x: { show: true },
        marker: { show: false },
        style: { fontFamily: "Darker Grotesque, sans-serif" },
    },
});

const optionsDelegation = {
    ...baseOptions("ns-shared"),
    colors: ["#FF9404"],
    chart: {
        ...baseOptions("ns-shared").chart,
        group: "ns-shared-top",
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
                formatter: (v: number) =>
                    v === 0 ? "0.00" : `${(v / 1_000_000).toFixed(1)}M`,
                style: { colors: [labelColor] },
                minWidth: yLabelMinMaxWidth,
                maxWidth: yLabelMinMaxWidth,
                offsetX: -8,
            },
        },
    ],
    xaxis: { ...baseOptions("ns-shared").xaxis, labels: { show: false } },
};

const optionsSold = {
    ...baseOptions("ns-shared"),
    colors: ["#5856D7"],
    chart: {
        ...baseOptions("ns-shared").chart,
        group: "ns-shared-middle",
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
                formatter: (v: number) =>
                    v === 0 ? "0.00" : `${(v / 1_000_000).toFixed(1)}M`,
                style: { colors: [labelColor] },
                minWidth: yLabelMinMaxWidth,
                maxWidth: yLabelMinMaxWidth,
                offsetX: -8,
            },
        },
    ],
    xaxis: { ...baseOptions("ns-shared").xaxis, labels: { show: false } },
};

const optionsPrice = {
    ...baseOptions("ns-shared"),
    colors: ["#31ADE6"],
    chart: {
        ...baseOptions("ns-shared").chart,
        group: "ns-shared-bottom",
    },
    grid: {
        ...baseOptions("ns-shared").grid,
        padding: { left: 0, right: 0, top: -2, bottom: 16 },
    },
    xaxis: {
        ...baseOptions("ns-shared").xaxis,
        labels: {
            ...baseOptions("ns-shared").xaxis.labels,
            show: true,
        },
    },
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
};

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

export default function GraphMetrics() {
    return (
        <>
            <div className="w-fit mt-2 text-xl font-[500] text-[#7c70c3]">
                Graph Metrics
            </div>
            <div className="flex gap-5 flex-row h-fit w-full">
                <div className="flex flex-col min-w-[230px] max-w-[230px] overflow-visible gap-3 ml-0 p-0">
                    <div className="flex flex-col w-full h-full gap-5">
                        {metrics.map((metric) => (
                            <MetricContent key={metric.id} metric={metric} />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col w-full p-2 bg-[#f5f5ff] rounded-[20px] border-[0.5px] border-[#bebee7]">
                    <div className="flex flex-col items-center mb-5 py-2 px-4 h-11 w-full">
                        <div className="flex items-baseline justify-between w-full">
                            <div
                                className="text-[28px] font-[500] text-[#250054]"
                                id="summary-graph-title"
                            >
                                Reward Flow Overview
                            </div>
                        </div>
                        <div
                            className="w-full text-start -mt-0.5 text-[#7c70c3] font-normal text-xl/4"
                            id="summary-graph-description"
                        >
                            Shows how validators respond to changes in price and
                            delegation in the market
                        </div>
                    </div>
                    <div
                        className="w-full"
                        id="network-summary-graph-container"
                    >
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
                                options={optionsDelegation as any}
                                series={seriesDelegation as any}
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
                                options={optionsSold as any}
                                series={seriesSold as any}
                                height={110}
                            />
                        </div>
                        <div
                            style={{
                                height: 110,
                                margin: 0,
                                padding: 0,
                                lineHeight: 0,
                            }}
                        >
                            <Chart
                                type="area"
                                options={optionsPrice as any}
                                series={seriesPrice as any}
                                height={150}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
