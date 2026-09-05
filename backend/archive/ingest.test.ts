import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextChunkToIngest } from './ingest';

// startHeight 21,870,000 is chunk-aligned (21,870,000 / 1000 = 21870 exactly)
// in all these cases, which matches the plan's actual configured value.
const START = 21_870_000;

test('fresh manifest (completeThroughHeight null): first chunk is [startHeight, startHeight+999]', () => {
    assert.deepEqual(nextChunkToIngest(START, null, START + 5000), {
        from: 21_870_000,
        to: 21_870_999,
    });
});

test('tip not yet past the first full chunk: nothing to ingest', () => {
    assert.equal(nextChunkToIngest(START, null, START + 500), null);
});

test('tip exactly at the last height of the chunk: chunk is ready', () => {
    assert.deepEqual(nextChunkToIngest(START, null, START + 999), {
        from: 21_870_000,
        to: 21_870_999,
    });
});

test('tip one short of the chunk boundary: chunk is NOT ready (no partial chunks)', () => {
    assert.equal(nextChunkToIngest(START, null, START + 998), null);
});

test('resuming mid-history: next chunk starts right after completeThroughHeight', () => {
    const completeThroughHeight = 21_875_999; // 6 chunks done
    assert.deepEqual(nextChunkToIngest(START, completeThroughHeight, START + 20_000), {
        from: 21_876_000,
        to: 21_876_999,
    });
});

test('caught up to the tip: returns null even mid-chunk', () => {
    const completeThroughHeight = 21_875_999;
    assert.equal(nextChunkToIngest(START, completeThroughHeight, 21_876_500), null);
});
