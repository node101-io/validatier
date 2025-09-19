import ValidatorLeaderboard from "@/components/validator-leaderboards/validator-leaderboard";
import Validator from "@/types/validator";
import Leaderboard from "@/types/leaderboard";

export default function ValidatorLeaderboards() {
    const validators: Validator[] = [
        {
            id: "1",
            name: "Validator 1",
            operatorAddress: "validator1",
            image: "https://via.placeholder.com/150",
            totalStaked: 100,
            usdValue: "100",
        },
        {
            id: "1",
            name: "Validator 1",
            operatorAddress: "validator1",
            image: "https://via.placeholder.com/150",
            percentageSold: 100,
        },
    ];

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
        <div className="mt-2">
            <div className="text-xl font-[500] text-[#7c70c3]">
                Leaderboards
            </div>
            <div className="flex justify-around w-full h-[650px] gap-5 my-2.5 overflow-y-hidden -ml-10 px-10">
                {leaderboards.map((leaderboard) => {
                    return (
                        <ValidatorLeaderboard
                            validators={validators}
                            leaderboard={leaderboard}
                        />
                    );
                })}
            </div>
        </div>
    );
}
