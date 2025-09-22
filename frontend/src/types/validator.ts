export default interface Validator {
    id: string;
    name: string;
    image: string;
    operatorAddress: string;
    percentageSold?: number;
    totalSold?: number;
    avgDelegation?: number;
    totalRewards?: number;
    selfStake?: number;
}
