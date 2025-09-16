import NetworkSummary from "@/components/network-summary/network-summary";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";

export default function Inner() {
    return (
        <div className="inner-main-wrapper" id="inner-main-wrapper">
            <div className="network-summary-main-wrapper">
                <div
                    className="network-summary-main-wrapper"
                    id="network-summary-main-wrapper"
                >
                    <div className="network-summary-main-wrapper-title each-section-title-content">
                        Network Summary
                    </div>
                    <div className="network-summary-network-stats-main-wrapper">
                        <NetworkSummary
                            componentName="network-summary-stat-self_stake_sum"
                            leftColumn={
                                <>
                                    <div className="each-network-summary-stat-header-title">
                                        Self Stake Amount
                                    </div>
                                    <div
                                        className="each-network-summary-stat-content summary-self-stake-amount-native undefined"
                                        id="summary-self-stake-amount-native"
                                    >
                                        761K ATOM
                                    </div>
                                    <div
                                        className="each-network-summary-stat-footer-value summary-self-stake-amount-usd"
                                        id="summary-self-stake-amount-usd"
                                    >
                                        $3.4M
                                    </div>
                                </>
                            }
                            rightColumn={<div>TBA</div>}
                        />
                        <NetworkSummary
                            componentName="network-summary-stat-percentage_sold"
                            leftColumn={
                                <>
                                    <div className="each-network-summary-stat-header-title">
                                        Percentage sold
                                    </div>
                                    <div
                                        className="each-network-summary-stat-content summary-percentage-sold-native summary-percentage-text-native"
                                        id="summary-percentage-sold-native"
                                    >
                                        24%
                                    </div>
                                    <div className="each-network-summary-stat-content stat-value-font-large"></div>
                                </>
                            }
                            rightColumn={
                                <>
                                    <div className="percentage-sold-main-circle">
                                        <span>76%</span>
                                        <div
                                            className="percentage-sold-inner-circle summary-percentage-sold-native"
                                            style={{
                                                width: "calc(var(--percentage-sold-main-circle-diameter) * 0.47958315233127197)",
                                            }}
                                        >
                                            <span>24%</span>
                                        </div>
                                    </div>
                                </>
                            }
                        />
                        <NetworkSummary
                            componentName="network-summary-stat-average_self_stake_ratio"
                            leftColumn={
                                <>
                                    <div className="each-network-summary-stat-header-title">
                                        Avg. Self/Total Stake
                                    </div>
                                    <div
                                        className="each-network-summary-stat-content summary-average-self-stake-ratio-native summary-percentage-text-native"
                                        id="summary-average-self-stake-ratio-native"
                                    >
                                        5%
                                    </div>
                                    <div className="each-network-summary-stat-content stat-value-font-large"></div>
                                </>
                            }
                            rightColumn={<div>TBA</div>}
                        />
                    </div>
                </div>
            </div>
            <GraphMetrics />
        </div>
    );
}
