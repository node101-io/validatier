import ValidatorLeaderboard from "@/components/validator-leaderboards/validator-leaderboard";
import Validator from "@/types/validator";
import Leaderboard from "@/types/leaderboard";
import { formatAtom, formatAtomUSD, formatPercentage } from "@/utils/format-numbers";

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
        <div className="mt-2 w-full">
            <div className="text-xl font-[500] text-[#7c70c3]">
                Leaderboards
            </div>
            <div className="flex justify-around w-full h-[650px] gap-5 my-2.5 overflow-x-auto lg:overflow-hidden no-scrollbar">
                {leaderboards.map((leaderboard, index) => {
                    {
                        /* TODO: Use seperate component for each leaderboard since validators are different */
                    }
                    return (
                        <ValidatorLeaderboard
                            key={index}
                            validators={validators}
                            leaderboard={leaderboard}
                        />
                    );
                })}
            </div>
        </div>
    );
}
