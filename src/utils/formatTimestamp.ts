export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split("T")[0];
}