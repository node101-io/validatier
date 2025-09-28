export function formatNumber(num: number) {
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
}

export function formatPercentage(
    value: number,
    maximumFractionDigits = 0
): string {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits,
    }).format(value);
}

export function formatAtom(value: number, maximumFractionDigits = 0): string {
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits,
    }).format(value / 1_000_000);
}

export function formatAtomUSD(
    value: number,
    maximumFractionDigits = 1
): string {
    const price = 1000; // TODO: get price from API
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits,
    }).format((value / 1_000_000) * price);
}
