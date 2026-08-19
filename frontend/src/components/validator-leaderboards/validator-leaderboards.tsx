import ValidatorLeaderboard from "@/components/validator-leaderboards/validator-leaderboard";
import ExchangeLeaderboard from "@/components/validator-leaderboards/exchange-leaderboard";
import type Validator from "@/types/validator";
import type Leaderboard from "@/types/leaderboard";
import type { SinkBreakdownEntry } from "@/types/data";
import {
  formatAtom,
  formatAtomUSD,
  formatPercentage,
} from "@/utils/format-numbers";

export default function ValidatorLeaderboards({
  validators,
  percentageSold,
  totalSold,
  sinkBreakdown,
  price,
}: {
  validators: Validator[];
  percentageSold: number;
  totalSold: number;
  sinkBreakdown: SinkBreakdownEntry[];
  price: number;
}) {
  const percentageSoldAsc = [...validators]
    .sort((a, b) => a.percentage_sold - b.percentage_sold)
    .slice(0, 10);
  const percentageSoldDesc = [...validators]
    .sort((a, b) => b.percentage_sold - a.percentage_sold)
    .slice(0, 10);
  const topByPercentageSold = [...percentageSoldAsc, ...percentageSoldDesc];

  const totalSoldAsc = [...validators].sort((a, b) => a.sold - b.sold).slice(0, 10);
  const totalSoldDesc = [...validators].sort((a, b) => b.sold - a.sold).slice(0, 10);
  const topByTotalSold = [...totalSoldAsc, ...totalSoldDesc];

  const exchangeSoldTotal = sinkBreakdown.reduce((sum, e) => sum + e.sold, 0);

  const leaderboards: Leaderboard[] = [
    {
      type: "percentageSold",
      title: "Percentage Sold",
      summaryContent: `${formatPercentage(percentageSold)}%`,
    },
    {
      type: "totalSold",
      title: "Total Sold Amount",
      summaryContent: `${formatAtom(totalSold, 1)} ATOM`,
      usdValue: `$${formatAtomUSD(totalSold, price)}`,
    },
    {
      type: "exchangeSold",
      title: "Sold to Exchanges",
      summaryContent: `${formatAtom(exchangeSoldTotal, 1)} ATOM`,
      usdValue: `$${formatAtomUSD(exchangeSoldTotal, price)}`,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 mt-2 w-full">
      <div className="text-xl font-[500] text-[#7c70c3] px-5 lg:px-0">Leaderboards</div>
      <div className="flex justify-start w-full h-fit gap-5 my-2.5 overflow-x-scroll lg:overflow-visible lg:grid lg:grid-cols-3 no-scrollbar px-5 lg:px-0">
        {leaderboards.map((leaderboard, index) => {
          if (leaderboard.type === "exchangeSold") {
            return (
              <ExchangeLeaderboard
                key={index}
                entries={sinkBreakdown}
                leaderboard={leaderboard}
                price={price}
              />
            );
          }
          const data =
            leaderboard.type === "percentageSold"
              ? topByPercentageSold
              : topByTotalSold;
          return (
            <ValidatorLeaderboard
              key={index}
              validators={data}
              leaderboard={leaderboard}
              price={price}
            />
          );
        })}
      </div>
    </div>
  );
}
