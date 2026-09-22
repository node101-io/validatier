import fs from 'node:fs/promises';
import path from 'node:path';
import { getObject, putObject, type R2Config } from './lib/r2';
import { readManifest as r2ReadManifest, writeManifest as r2WriteManifest, type Manifest } from './lib/manifest';
import { encodeJsonl, decodeJsonl, zstdCompress, zstdDecompress } from './lib/chunk';

// Lead dev's call (2026-08-25): local disk is the PRIMARY store, R2 is a
// BACKUP only — not a cache-in-front-of-R2. Reasoning: the whole archive is
// ~23-28 GB, trivial for any server's disk, and R2 requests (GET *and* PUT)
// cost money even though egress from R2 is free — so normal operation
// should never touch R2 at all. R2 exists purely so a new server (or a
// wiped local disk) can restore instead of re-running the multi-day live
// backfill.
//
// Local chunk/staking files are stored zstd-compressed (same bytes as the
// R2 backup, written once and reused for both — not compressed twice).
// Originally local was written as plain JSONL; measured 2026-09-14 on a
// live server this hit 664GB (heading for ~1.1TB at full backfill) against
// a ~53x measured compression ratio on this data (repetitive JSON keys /
// bech32 addresses) — the "~23-28GB" estimate above was the R2 (compressed)
// size, never the uncompressed local size. Switched local to compressed too
// (~20-25GB total) at the cost of a decompress on every read — cheap
// relative to a disk that would otherwise blow past what most servers have.
//
// This is the layer both the ingester (archive/ingest.ts, writer) and the
// wrapper (archive/server.ts, reader) go through — NEVER call r2.ts /
// manifest.ts's R2 functions directly from either of those. Both processes
// MUST share the same ARCHIVE_CACHE_DIR (same machine or same mounted
// volume) for "local is primary" to mean anything; if they don't, the
// wrapper falls back to R2 on every read, which defeats the whole point.
//
// Uses node:fs/promises throughout, not the sync fs API — this backs every
// wrapper HTTP request (archive/server.ts), and a sync disk read/write
// would block Node's single event loop for its duration, serializing
// otherwise-independent concurrent requests (caught by code review).

function pad(chunkId: number): string {
    return String(chunkId).padStart(8, '0');
}

function manifestPath(cacheDir: string): string {
    return path.join(cacheDir, 'manifest.json');
}

// .jsonl.zst / .json.zst — same extension as the R2 keys, since local now
// stores the identical compressed bytes.
function chunkPath(cacheDir: string, kind: 'block_results' | 'block_headers', chunkId: number): string {
    return path.join(cacheDir, kind, `${pad(chunkId)}.jsonl.zst`);
}

function stakingPath(cacheDir: string, day: string): string {
    return path.join(cacheDir, 'staking', `${day}.json.zst`);
}

// Reads a local file's contents, or null if it doesn't exist — a single
// read+catch instead of a separate existence check (fs/promises has no
// direct `existsSync` equivalent, and a check-then-read would be a TOCTOU
// race anyway). Rethrows any error other than "file doesn't exist".
async function readIfExists(p: string): Promise<string | null> {
    try {
        return await fs.readFile(p, 'utf8');
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
    }
}

// fs.writeFile is NOT atomic — a process killed mid-write (Ctrl-C, a crash,
// pm2 restart) while it's writing to an EXISTING path can leave a file
// that's part old content + part new content, silently. Confirmed as a
// real, not just theoretical, failure mode 2026-09-21: a corrupted
// block_results chunk on the server decompressed cleanly (so the .zst
// framing itself was intact) but had a JSON syntax error partway through —
// consistent with an interrupted overwrite mixing two different-length
// writes, not a compression-level truncation. Write to a temp path in the
// same directory, then rename() — atomic on POSIX (the target is either
// the fully-old or fully-new file, never a mix), so an interrupted write
// only ever orphans the harmless temp file.
async function atomicWriteFile(p: string, data: string | Buffer): Promise<void> {
    await fs.mkdir(path.dirname(p), { recursive: true });
    const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, p);
}

// The manifest stays plain JSON (tiny, and worth being human-readable for
// a quick `cat` during troubleshooting) — only chunk/staking payloads below
// switch to compressed bytes.
async function writeLocal(p: string, text: string): Promise<void> {
    await atomicWriteFile(p, text);
}

async function readLocalCompressed(p: string): Promise<Buffer | null> {
    try {
        return await fs.readFile(p);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
    }
}

async function writeLocalCompressed(p: string, buf: Buffer): Promise<void> {
    await atomicWriteFile(p, buf);
}

// Local first. Only touches R2 when nothing local exists yet — a fresh
// server, or a wiped cache dir. Restoring writes the local copy so the NEXT
// call never hits R2 again.
export async function loadManifest(
    r2: R2Config,
    cacheDir: string,
    startHeight: number,
): Promise<Manifest> {
    const p = manifestPath(cacheDir);
    const local = await readIfExists(p);
    if (local !== null) {
        const m = JSON.parse(local) as Manifest;
        if (m.startHeight !== startHeight) {
            throw new Error(
                `local manifest startHeight mismatch: disk has ${m.startHeight}, config says ${startHeight}`,
            );
        }
        return m;
    }
    // Cold start / disaster recovery: restore from the R2 backup (which
    // itself returns a fresh empty manifest if even that doesn't exist —
    // true first-ever run).
    const restored = await r2ReadManifest(r2, startHeight);
    await writeLocal(p, JSON.stringify(restored, null, 2));
    return restored;
}

// Writes local (primary, always) AND mirrors to R2 (backup). The R2 write
// is still a real network call every time — unavoidable, since a backup
// that's never written can't restore anything — but it happens once per
// chunk during backfill, never on a read path.
export async function saveManifest(r2: R2Config, cacheDir: string, manifest: Manifest): Promise<void> {
    const withTs: Manifest = { ...manifest, updatedAt: new Date().toISOString() };
    await writeLocal(manifestPath(cacheDir), JSON.stringify(withTs, null, 2));
    await r2WriteManifest(r2, withTs);
}

// Local first; on a local miss, restores from the R2 backup and writes it
// locally so every subsequent read of this chunk is local-only. Returns
// null only when the chunk genuinely doesn't exist anywhere (not archived
// yet) — a real "not found", not a transient miss.
export async function readChunk(
    r2: R2Config,
    cacheDir: string,
    kind: 'block_results' | 'block_headers',
    chunkId: number,
): Promise<unknown[] | null> {
    const p = chunkPath(cacheDir, kind, chunkId);
    const local = await readLocalCompressed(p);
    if (local !== null) return decodeJsonl(zstdDecompress(local));

    const compressed = await getObject(r2, `${kind}/${pad(chunkId)}.jsonl.zst`);
    if (compressed === null) return null;
    await writeLocalCompressed(p, compressed);
    return decodeJsonl(zstdDecompress(compressed));
}

// Writes local (primary — this IS what the wrapper will read, decompressing
// on the way out) and uploads the SAME zstd-compressed bytes to R2 as a
// backup — compressed once, used for both, not compressed twice. Called
// once per chunk, ever (chunks are immutable once ingested — see
// ingest.ts's "only ingest a chunk once fully behind tip").
export async function writeChunk(
    r2: R2Config,
    cacheDir: string,
    kind: 'block_results' | 'block_headers',
    chunkId: number,
    rows: unknown[],
): Promise<void> {
    const compressed = zstdCompress(encodeJsonl(rows));
    await writeLocalCompressed(chunkPath(cacheDir, kind, chunkId), compressed);
    await putObject(r2, `${kind}/${pad(chunkId)}.jsonl.zst`, compressed);
}

// One JSON object per UTC day, not chunked (a day's full validator list is
// a single small object, unlike the 1000-block block_results/block_headers
// batches) — see archive/stakingIngest.ts (TASKS.md 11.6). Same local-first
// pattern as everything else in this file: local disk is what the wrapper
// reads, R2 is the backup copy.
export async function readStakingSnapshot(
    r2: R2Config,
    cacheDir: string,
    day: string,
): Promise<unknown | null> {
    const p = stakingPath(cacheDir, day);
    const local = await readLocalCompressed(p);
    if (local !== null) return JSON.parse(zstdDecompress(local));

    const compressed = await getObject(r2, `staking/${day}.json.zst`);
    if (compressed === null) return null;
    await writeLocalCompressed(p, compressed);
    return JSON.parse(zstdDecompress(compressed));
}

export async function writeStakingSnapshot(r2: R2Config, cacheDir: string, day: string, snapshot: unknown): Promise<void> {
    const compressed = zstdCompress(JSON.stringify(snapshot));
    await writeLocalCompressed(stakingPath(cacheDir, day), compressed);
    await putObject(r2, `staking/${day}.json.zst`, compressed);
}
