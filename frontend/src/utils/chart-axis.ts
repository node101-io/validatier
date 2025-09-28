// Utility helpers for chart axis calculations

export function roundToFirstTwoDigits(number: number, method: 'floor' | 'ceil' | 'round' = 'floor'): number {
  if (!isFinite(number) || number === 0) return 0;

  const isNegative = number < 0;
  let abs = Math.abs(number);

  const digits = Math.floor(Math.log10(abs));
  const factor = Math.pow(10, digits);
  const twoDigits = abs / factor;

  let roundedTwoDigits: number;
  if (method === 'floor') {
      roundedTwoDigits = Math.floor(twoDigits);
  } else if (method === 'ceil') {
      roundedTwoDigits = Math.ceil(twoDigits);
  } else {
      roundedTwoDigits = Math.round(twoDigits);
  }

  const rounded = roundedTwoDigits * factor;
  return isNegative ? -rounded : rounded;
}

export function computeYAxisMax(series: Array<{ data: number[] }>, headroomRatio: number = 0.10, fallbackMax: number = 1): number {
  try {
      const flatValues: number[] = [];
      for (const s of series || []) {
          if (!s || !Array.isArray(s.data)) continue;
          for (const v of s.data) if (typeof v === 'number' && isFinite(v)) flatValues.push(v);
      }
      const rawMax = flatValues.length ? Math.max(...flatValues) : fallbackMax;
      const adjusted = rawMax * (1 + headroomRatio);
      return roundToFirstTwoDigits(adjusted, 'ceil') || fallbackMax;
  } catch {
      return fallbackMax;
  }
}
