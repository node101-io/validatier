// uatom BigInt-strings -> ATOM `number`, for the static JSON export boundary only
// (docs/05-frontend-data-layer.md: "the frontend never sees a uatom string").

export function uatomToAtom(
  value: string | bigint | null | undefined,
  decimals: number,
): number {
  if (value === null || value === undefined) return 0
  const uatom = typeof value === 'bigint' ? value : BigInt(value)
  return Number(uatom) / 10 ** decimals
}

export function sumBigIntStrings(
  values: Array<string | null | undefined>,
): bigint {
  return values.reduce<bigint>((sum, v) => sum + (v ? BigInt(v) : 0n), 0n)
}
