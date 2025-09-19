export default interface Leaderboard {
    type: "percentageSold" | "totalSold";
    title: "Percentage Sold" | "Total Sold Amount";
    summaryContent: string;
    usdValue?: string;
}
