export default interface Metric {
  id: string;
  color: string;
  title: string;
  valueNative: number;
  valueUsd?: number;
  percentageChange?: string;
}
