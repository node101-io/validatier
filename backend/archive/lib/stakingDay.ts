// Day-string helpers + the binary search that maps a UTC calendar day to
// its first block height — used by the staking snapshot backfill
// (archive/stakingIngest.ts, TASKS.md 11.6). Deliberately zero-padded
// 'YYYY-MM-DD' (unlike jobs/blockLoop.ts's utcDayFromTs, which only needs
// day-changed inequality, not sortability) — this format sorts correctly
// as a plain string, which manifest.ts's `stakingCompleteThroughDay` and
// the day-walk below both rely on.

export function formatUtcDay(unixSeconds: number): string {
    const d = new Date(unixSeconds * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function nextUtcDay(day: string): string {
    const [y, m, d] = day.split('-').map(Number);
    const next = new Date(Date.UTC(y!, m! - 1, d! + 1));
    return formatUtcDay(Math.floor(next.getTime() / 1000));
}

// Plain string comparison works because the format is zero-padded and
// fixed-width — no need to parse dates just to order two day strings.
export function compareUtcDay(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

// Pure decision: which day (if any) does the staking backfill still need
// to produce, given how far it's gotten and the latest day the chain
// actually has (the chain's own tip day, NOT wall-clock — matches this
// codebase's existing rule of using chain time, not wall-clock, for
// backfill progress; see jobs/dailyJobs.ts's validator-sync gate for the
// same principle applied elsewhere). Mirrors archive/ingest.ts's
// nextChunkToIngest — same shape, same reason (unit-testable without
// touching the network).
export function nextStakingDayToBackfill(
    startDay: string,
    completeThroughDay: string | null,
    latestChainDay: string,
): string | null {
    const next = completeThroughDay === null ? startDay : nextUtcDay(completeThroughDay);
    return compareUtcDay(next, latestChainDay) <= 0 ? next : null;
}

export interface HeightTime {
    height: number;
    ts: number; // unix seconds
}

// Finds the first height (in ascending order) whose block falls on UTC day
// `day`, searching within [lo, hi] (both inclusive). Block time is
// monotonically non-decreasing with height, so "day of block" is also
// monotonically non-decreasing — a standard leftmost-binary-search applies.
// `getTime(height)` is injected so this is testable with an in-memory fake
// instead of a real chain (see stakingDay.test.ts); the real caller
// (archive/stakingIngest.ts) passes a function backed by ChainClient.getBlock.
export async function findFirstHeightOfDay(
    getTime: (height: number) => Promise<number>,
    day: string,
    lo: number,
    hi: number,
): Promise<HeightTime> {
    if (lo > hi) {
        throw new Error(`findFirstHeightOfDay: empty search range [${lo}, ${hi}] for day ${day}`);
    }
    let left = lo;
    let right = hi;
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        const midDay = formatUtcDay(await getTime(mid));
        if (compareUtcDay(midDay, day) >= 0) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    const ts = await getTime(left);
    const foundDay = formatUtcDay(ts);
    if (foundDay !== day) {
        throw new Error(
            `findFirstHeightOfDay: no block for day ${day} in range [${lo}, ${hi}] ` +
                `(closest candidate height ${left} is day ${foundDay})`,
        );
    }
    return { height: left, ts };
}
