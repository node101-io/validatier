import MetricContent from "../metric-content/metric-content";
import Metric from "@/types/metric";

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

export default function GraphMetrics() {
    return (
        <>
            <div className="network-summary-network-graph-metrics-wrapper-title each-section-title-content">
                Graph Metrics
            </div>
            <div className="network-summary-network-graph-main-wrapper">
                <div className="network-summary-network-graph-metrics-wrapper">
                    <div className="network-summary-network-graph-metrics-content-wrapper">
                        {metrics.map((metric) => {
                            return <MetricContent metric={metric} />;
                        })}
                    </div>
                </div>
                <div className="network-summary-network-graph-content-wrapper">
                    <div className="network-summary-network-graph-content-header">
                        <div className="network-summary-network-graph-content-header-main">
                            <div
                                className="network-summary-network-graph-content-title"
                                id="summary-graph-title"
                            >
                                Reward Flow Overview
                            </div>
                        </div>
                        <div
                            className="network-summary-network-graph-content-description"
                            id="summary-graph-description"
                        >
                            Shows how validators respond to changes in price and
                            delegation in the market
                        </div>
                    </div>
                    <div
                        className="network-summary-network-graph-content"
                        id="network-summary-graph-container"
                    ></div>
                </div>
            </div>
        </>
    );
}
