export function formatPercentage(
  value: number,
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-US", {
      maximumFractionDigits,
  }).format(value);
}

export function formatAtom(
  value: number,
  maximumFractionDigits = 0
): string {
  return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits,
  }).format(value / 1_000_000);
}

export function formatAtomUSD(
  value: number,
  price: number,
  maximumFractionDigits = 1,
): string {
  return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits,
  }).format(value / 1_000_000 * price);
}