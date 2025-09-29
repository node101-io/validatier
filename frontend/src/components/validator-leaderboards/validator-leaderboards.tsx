import ValidatorLeaderboard from "@/components/validator-leaderboards/validator-leaderboard";
import Validator from "@/types/validator";
import Leaderboard from "@/types/leaderboard";
import {
    formatAtom,
    formatAtomUSD,
    formatPercentage,
} from "@/utils/format-numbers";

export default function ValidatorLeaderboards({
    validators,
    percentageSold,
    totalSold,
    price,
}: {
    validators: Validator[];
    percentageSold: number;
    totalSold: number;
    price: number;
}) {
    const topByPercentageSold = [...validators]
        .sort(
            (a, b) =>
                (a.percentage_sold ?? Infinity) -
                (b.percentage_sold ?? Infinity)
        )
        .slice(0, 10);

    const topByTotalSold = [...validators]
        .sort((a, b) => (a.sold ?? Infinity) - (b.sold ?? Infinity))
        .slice(0, 10);

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
    ];

    return (
        <div className="flex flex-col gap-2.5 mt-2 w-full">
            <div className="text-xl font-[500] text-[#7c70c3] px-5">
                Leaderboards
            </div>
            <div className="flex justify-around w-full h-[650px] gap-5 my-2.5 overflow-x-scroll lg:overflow-hidden no-scrollbar px-5 lg:px-0">
                {leaderboards.map((leaderboard, index) => {
                    {
                        /* TODO: Use seperate component for each leaderboard since validators are different */
                    }
                    const data =
                        leaderboard.type === "percentageSold"
                            ? topByPercentageSold
                            : leaderboard.type === "totalSold"
                            ? topByTotalSold
                            : validators;
                    return (
                        <ValidatorLeaderboard
                            key={index}
                            validators={data}
                            leaderboard={leaderboard}
                        />
                    );
                })}
            </div>
        </div>
    );
}
