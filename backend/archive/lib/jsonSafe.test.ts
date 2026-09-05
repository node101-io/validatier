import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJsonSafe } from './jsonSafe';

test('Uint8Array becomes a base64 string', () => {
    const bytes = new Uint8Array([0, 1, 2, 255]);
    assert.equal(toJsonSafe(bytes), Buffer.from(bytes).toString('base64'));
});

test('bigint becomes a decimal string', () => {
    assert.equal(toJsonSafe(12345678901234567890n), '12345678901234567890');
});

test('Date becomes an ISO string', () => {
    const d = new Date('2026-08-24T11:41:06.613Z');
    assert.equal(toJsonSafe(d), '2026-08-24T11:41:06.613Z');
});

test('recurses through nested objects and arrays, round-trips through JSON', () => {
    const input = {
        height: 12345,
        blockId: { hash: new Uint8Array([1, 2, 3]) },
        header: { time: new Date('2026-01-01T00:00:00.000Z'), proposer: new Uint8Array([9, 9]) },
        list: [new Uint8Array([1]), { nested: 5n }],
    };
    const safe = toJsonSafe(input);
    const roundTripped = JSON.parse(JSON.stringify(safe));
    assert.equal(roundTripped.height, 12345);
    assert.equal(roundTripped.blockId.hash, Buffer.from([1, 2, 3]).toString('base64'));
    assert.equal(roundTripped.header.time, '2026-01-01T00:00:00.000Z');
    assert.equal(roundTripped.list[1].nested, '5');
});
