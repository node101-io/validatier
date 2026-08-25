import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parallelMap } from './parallelMap';

test('applies fn to every item, preserving input order in the output', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const out = await parallelMap(items, 4, async (n) => {
        await new Promise((r) => setTimeout(r, Math.random() * 3));
        return n * 2;
    });
    assert.deepEqual(out, items.map((n) => n * 2));
});

test('runs at most `concurrency` items at once', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await parallelMap(Array.from({ length: 30 }, (_, i) => i), 5, async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 2));
        inFlight--;
    });
    assert.ok(maxInFlight <= 5);
    assert.ok(maxInFlight > 1, 'sanity: some overlap should actually happen');
});

test('propagates a thrown error', async () => {
    await assert.rejects(() =>
        parallelMap([1, 2, 3], 2, async (n) => {
            if (n === 2) throw new Error('boom');
            return n;
        }),
    );
});

test('handles an empty input', async () => {
    assert.deepEqual(await parallelMap([], 4, async (n) => n), []);
});
