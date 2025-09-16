export default interface Metric {
    id: string;
    color: string;
    title: string;
    valueNative: string;
    valueUsd?: string;
    percentageChange?: string;
}
