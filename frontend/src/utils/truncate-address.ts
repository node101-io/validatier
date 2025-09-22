export default function truncateAddress(
    address: string,
    maxLength: number = 10
): string {
    if (address.length <= maxLength) return address;
    const start = Math.floor((maxLength - 3) / 2);
    const end = maxLength - 3 - start;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}
