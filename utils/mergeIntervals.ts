
export const mergeIntervals = (arr1: number[], arr2: number[]): number[] => {
  return Array.from(new Set([...arr1, ...arr2])).sort((a, b) => a - b);
}
