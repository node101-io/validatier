import ValidatorLeaderboard from "@/components/validator-leaderboards/validator-leaderboard";
import Validator from "@/types/validator";
import Leaderboard from "@/types/leaderboard";

export default function ValidatorLeaderboards({
    validators,
}: {
    validators: Validator[];
}) {
    const leaderboards: Leaderboard[] = [
        {
            type: "percentageSold",
            title: "Percentage Sold",
            summaryContent: "24%",
        },
        {
            type: "totalSold",
            title: "Total Sold Amount",
            summaryContent: "11.1M ATOM",
            usdValue: "$51.9M",
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
