import "@/../public/css/index/summary.css";

export default function NetworkSummary({
    leftColumn,
    rightColumn,
    componentName,
}: {
    leftColumn: React.ReactNode;
    rightColumn: React.ReactNode;
    componentName?: string;
}) {
    return (
        <>
            <div
                className={`each-network-summary-stat ${componentName}`}
                id={componentName}
            >
                <div className="each-network-summary-stat-column">
                    {leftColumn}
                </div>
                <div className="each-network-summary-stat-column">
                    {rightColumn}
                </div>
            </div>
        </>
    );
}
