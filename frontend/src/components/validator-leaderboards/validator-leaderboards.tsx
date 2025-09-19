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
            percentageSold: 85,
        },
        {
            id: "2",
            name: "Validator 2",
            operatorAddress: "validator2",
            image: "https://via.placeholder.com/150",
            totalStaked: 95,
            usdValue: "95",
            percentageSold: 72,
        },
        {
            id: "3",
            name: "Validator 3",
            operatorAddress: "validator3",
            image: "https://via.placeholder.com/150",
            totalStaked: 90,
            usdValue: "90",
            percentageSold: 68,
        },
        {
            id: "4",
            name: "Validator 4",
            operatorAddress: "validator4",
            image: "https://via.placeholder.com/150",
            totalStaked: 85,
            usdValue: "85",
            percentageSold: 55,
        },
        {
            id: "5",
            name: "Validator 5",
            operatorAddress: "validator5",
            image: "https://via.placeholder.com/150",
            totalStaked: 80,
            usdValue: "80",
            percentageSold: 42,
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
        <div className="mt-2 w-full">
            <div className="text-xl font-[500] text-[#7c70c3]">
                Leaderboards
            </div>
            <div className="flex justify-around w-full h-[650px] gap-5 my-2.5 overflow-y-hidden">
                {leaderboards.map((leaderboard) => {
                    {
                        /* TODO: Use seperate component for each leaderboard since validators are different */
                    }
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
