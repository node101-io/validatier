import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    formatUtcDay,
    nextUtcDay,
    compareUtcDay,
    nextStakingDayToBackfill,
    findFirstHeightOfDay,
} from './stakingDay';

test('formatUtcDay zero-pads month and day', () => {
    assert.equal(formatUtcDay(Date.UTC(2024, 0, 5) / 1000), '2024-01-05');
    assert.equal(formatUtcDay(Date.UTC(2026, 10, 30) / 1000), '2026-11-30');
});

test('nextUtcDay advances one calendar day, including across month/year boundaries', () => {
    assert.equal(nextUtcDay('2024-01-05'), '2024-01-06');
    assert.equal(nextUtcDay('2024-01-31'), '2024-02-01');
    assert.equal(nextUtcDay('2024-12-31'), '2025-01-01');
    assert.equal(nextUtcDay('2024-02-28'), '2024-02-29'); // 2024 is a leap year
});

test('compareUtcDay orders zero-padded day strings correctly', () => {
    assert.ok(compareUtcDay('2024-01-05', '2024-01-06') < 0);
    assert.ok(compareUtcDay('2024-02-01', '2024-01-31') > 0);
    assert.equal(compareUtcDay('2024-01-05', '2024-01-05'), 0);
});

test('nextStakingDayToBackfill: fresh start returns startDay if the chain has reached it', () => {
    assert.equal(nextStakingDayToBackfill('2024-08-25', null, '2026-08-25'), '2024-08-25');
});

test('nextStakingDayToBackfill: fresh start returns null if the chain has not reached startDay yet', () => {
    assert.equal(nextStakingDayToBackfill('2026-09-01', null, '2026-08-25'), null);
});

test('nextStakingDayToBackfill: resumes the day after completeThroughDay', () => {
    assert.equal(nextStakingDayToBackfill('2024-08-25', '2024-08-25', '2026-08-25'), '2024-08-26');
});

test('nextStakingDayToBackfill: returns null once caught up to the chain tip day', () => {
    assert.equal(nextStakingDayToBackfill('2024-08-25', '2026-08-25', '2026-08-25'), null);
});

test('nextStakingDayToBackfill: "today" (the tip day) is included, not excluded', () => {
    // Unlike block_results chunking (which needs a FULL 1000-block chunk),
    // a day's snapshot only needs one block to exist on that day, which is
    // true the instant the day starts — so the tip's own day is a valid,
    // completable backfill target, not held back like a partial chunk.
    assert.equal(nextStakingDayToBackfill('2026-08-24', '2026-08-24', '2026-08-25'), '2026-08-25');
});

// --- findFirstHeightOfDay -------------------------------------------------

// A tiny fake chain: height -> unix-day-of-height, several blocks per day,
// mirroring cosmoshub's real ~6s block time (thousands of blocks/day) at a
// scale cheap enough for a unit test.
function fakeChain(blocksPerDay: number, days: number): (height: number) => Promise<number> {
    const DAY = 86_400;
    const totalHeights = blocksPerDay * days;
    return async (height: number) => {
        if (height < 1 || height > totalHeights) {
            throw new Error(`height ${height} out of fake chain range`);
        }
        const dayIndex = Math.floor((height - 1) / blocksPerDay);
        // spread timestamps within the day so it's not just day-boundary aligned
        const secondsIntoDay = ((height - 1) % blocksPerDay) * Math.floor(DAY / blocksPerDay);
        return dayIndex * DAY + secondsIntoDay;
    };
}

test('findFirstHeightOfDay finds the exact first height of a target day', async () => {
    const getTime = fakeChain(100, 10); // 100 blocks/day, 10 days, heights 1..1000
    // day index 3 (0-based) = 4th day = formatUtcDay(3*86400)
    const day3 = formatUtcDay(3 * 86_400);
    const result = await findFirstHeightOfDay(getTime, day3, 1, 1000);
    assert.equal(result.height, 301); // day index 3 starts at height 3*100+1 = 301
    assert.equal(formatUtcDay(result.ts), day3);
});

test('findFirstHeightOfDay finds the first day in the search range (lo boundary)', async () => {
    const getTime = fakeChain(50, 5);
    const day0 = formatUtcDay(0);
    const result = await findFirstHeightOfDay(getTime, day0, 1, 250);
    assert.equal(result.height, 1);
});

test('findFirstHeightOfDay finds the last day in the search range (hi boundary)', async () => {
    const getTime = fakeChain(50, 5);
    const day4 = formatUtcDay(4 * 86_400);
    const result = await findFirstHeightOfDay(getTime, day4, 1, 250);
    assert.equal(result.height, 201); // 4*50+1
});

test('findFirstHeightOfDay throws if the target day has no blocks in range', async () => {
    const getTime = fakeChain(50, 5); // days 0..4 only
    const day10 = formatUtcDay(10 * 86_400);
    await assert.rejects(() => findFirstHeightOfDay(getTime, day10, 1, 250), /no block for day/);
});

test('findFirstHeightOfDay is correct across a wide range with many blocks/day (realistic scale)', async () => {
    // ~14400 blocks/day (6s blocks), 30 days — closer to real cosmoshub scale.
    const getTime = fakeChain(14_400, 30);
    for (const dayIndex of [0, 1, 15, 29]) {
        const day = formatUtcDay(dayIndex * 86_400);
        const result = await findFirstHeightOfDay(getTime, day, 1, 14_400 * 30);
        assert.equal(result.height, dayIndex * 14_400 + 1);
    }
});
