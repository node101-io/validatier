export default interface Leaderboard {
  type: "percentageSold" | "totalSold" | "exchangeSold";
  title: "Percentage Sold" | "Total Sold Amount" | "Sold to Exchanges";
  summaryContent: string;
  usdValue?: string;
}
