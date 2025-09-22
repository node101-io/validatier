import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import Validator from "@/types/validator";

const validators: Validator[] = [
    {
        id: "1",
        name: "Validator 1 asd asd ad asdadasdasdas asd as",
        operatorAddress: "validator1ewqeqweqweqw",
        image: "https://via.placeholder.com/150",
        totalSold: 100,
        percentageSold: 85,
        avgDelegation: 12500,
        totalRewards: 45000,
        selfStake: 32000,
    },
    {
        id: "2",
        name: "Validator 2",
        operatorAddress: "validator2",
        image: "https://via.placeholder.com/150",
        totalSold: 95,
        percentageSold: 72,
        avgDelegation: 9800,
        totalRewards: 30000,
        selfStake: 15000,
    },
    {
        id: "3",
        name: "Validator 3",
        operatorAddress: "validator3",
        image: "https://via.placeholder.com/150",
        totalSold: 90,
        percentageSold: 68,
        avgDelegation: 7600,
        totalRewards: 28000,
        selfStake: 12000,
    },
    {
        id: "4",
        name: "Validator 4",
        operatorAddress: "validator4",
        image: "https://via.placeholder.com/150",
        totalSold: 85,
        percentageSold: 55,
        avgDelegation: 5400,
        totalRewards: 21000,
        selfStake: 9000,
    },
    {
        id: "5",
        name: "Validator 5",
        operatorAddress: "validator5",
        image: "https://via.placeholder.com/150",
        totalSold: 80,
        percentageSold: 42,
        avgDelegation: 4200,
        totalRewards: 15000,
        selfStake: 7000,
    },
];

export default function Home() {
    return (
        <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
            <div className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-scroll ml-0 h-screen rounded-0 bg-white transition-all duration-250">
                <Navbar />
                <Intro />
                <Inner validators={validators} />
                <StakeWithUs />
                <Footer />
            </div>
        </div>
    );
}
