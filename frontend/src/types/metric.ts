// Mirrors docs/05-static-json-contract.md Metric.
export default interface Metric {
  id: string;
  color: string;
  title: string;
  valueNative: number;
  percentageChange?: string;
}
