import zlib from 'node:zlib';

// Chunking: measured (plan §1.4) that grouping strip-edited blocks into
// 1000-block batches before zstd-19 compression is the sweet spot — going
// bigger buys almost nothing further (100→1.37, 250→1.30, 500→1.28,
// 1000→1.26 KB/block on a 997-block sample), and 1000 keeps each R2 object
// small enough (~1.3 MB at today's block size) for a cheap single GET.
export const CHUNK_SIZE = 1000;

export function chunkIdOf(height: number): number {
    return Math.floor(height / CHUNK_SIZE);
}

export function chunkRange(chunkId: number): { from: number; to: number } {
    return { from: chunkId * CHUNK_SIZE, to: chunkId * CHUNK_SIZE + CHUNK_SIZE - 1 };
}

// One JSON object per line (JSONL) — lets a chunk be decompressed and
// scanned without holding a giant parsed array in memory, and matches the
// row-per-height shape callers want to iterate over height-by-height.
export function encodeJsonl(rows: unknown[]): string {
    return rows.map((r) => JSON.stringify(r)).join('\n');
}

export function decodeJsonl(text: string): unknown[] {
    return text
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
}

// zstd-19: matches the plan's measured numbers (this level is what all the
// chunking sweet-spot measurements above were taken at). node:zlib has had
// native zstd since Node 22.15 / 23.8 — no external dependency.
const ZSTD_LEVEL = 19;

export function zstdCompress(text: string): Buffer {
    return zlib.zstdCompressSync(Buffer.from(text, 'utf8'), {
        params: { [zlib.constants.ZSTD_c_compressionLevel]: ZSTD_LEVEL },
    });
}

export function zstdDecompress(buf: Buffer): string {
    return zlib.zstdDecompressSync(buf).toString('utf8');
}
