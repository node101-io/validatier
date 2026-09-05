// Mirrors docs/05-frontend-data-layer.md Metric.
export default interface Metric {
  id: string;
  color: string;
  title: string;
  valueNative: number;
  percentageChange?: string;
}
