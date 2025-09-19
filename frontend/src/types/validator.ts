export default interface Validator {
    id: string;
    name: string;
    image: string;
    operatorAddress: string;
    percentageSold?: number;
    totalStaked?: number;
    usdValue?: string;
}
