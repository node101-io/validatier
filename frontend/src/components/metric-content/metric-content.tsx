import Metric from "@/types/metric";

export default function MetricContent({ metric }: { metric: Metric }) {
    return (
        <div
            className="each-metric-content-wrapper"
            id={`summary-metric-${metric.id}`}
        >
            <div className="each-metric-content-wrapper-header">
                <div
                    className="each-metric-content-wrapper-header-icon"
                    style={{ backgroundColor: metric.color }}
                ></div>
                <div className="each-metric-content-wrapper-header-title">
                    {metric.title}
                </div>
            </div>
            <div className="each-metric-content-wrapper-content">
                <div className="each-metric-content-wrapper-content-value-native">
                    {metric.valueNative}
                </div>
                <div className="each-metric-content-wrapper-content-value-usd">
                    {metric.valueUsd}
                </div>
            </div>
            <div className="each-metric-content-wrapper-footer">
                <span className="percentage-change-value-content">
                    {metric.percentageChange}
                </span>
            </div>
        </div>
    );
}
