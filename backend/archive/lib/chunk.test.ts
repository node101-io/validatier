import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkIdOf, chunkRange, encodeJsonl, decodeJsonl, zstdCompress, zstdDecompress } from './chunk';

test('chunkIdOf / chunkRange round-trip on the chosen chunk size', () => {
    assert.equal(chunkIdOf(21_870_000), 21870);
    assert.equal(chunkIdOf(21_870_999), 21870);
    assert.equal(chunkIdOf(21_871_000), 21871);
    assert.deepEqual(chunkRange(21870), { from: 21_870_000, to: 21_870_999 });
});

test('jsonl encode/decode round-trips arbitrary objects, including bigint-free nested data', () => {
    const rows = [{ height: 1, a: [1, 2, 3] }, { height: 2, a: null }, { height: 3 }];
    assert.deepEqual(decodeJsonl(encodeJsonl(rows)), rows);
});

test('decodeJsonl ignores a trailing blank line', () => {
    assert.deepEqual(decodeJsonl('{"a":1}\n{"a":2}\n'), [{ a: 1 }, { a: 2 }]);
});

test('zstd compress/decompress round-trips text and actually shrinks repetitive input', () => {
    const text = encodeJsonl(Array.from({ length: 500 }, (_, i) => ({ height: i, foo: 'bar'.repeat(20) })));
    const compressed = zstdCompress(text);
    assert.ok(compressed.length < text.length / 5, 'repetitive jsonl should compress well');
    assert.equal(zstdDecompress(compressed), text);
});
