import fs from 'node:fs';
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
// This is the layer both the ingester (archive/ingest.ts, writer) and the
// wrapper (archive/server.ts, reader) go through — NEVER call r2.ts /
// manifest.ts's R2 functions directly from either of those. Both processes
// MUST share the same ARCHIVE_CACHE_DIR (same machine or same mounted
// volume) for "local is primary" to mean anything; if they don't, the
// wrapper falls back to R2 on every read, which defeats the whole point.

function pad(chunkId: number): string {
    return String(chunkId).padStart(8, '0');
}

function manifestPath(cacheDir: string): string {
    return path.join(cacheDir, 'manifest.json');
}

function chunkPath(cacheDir: string, kind: 'block_results' | 'block_headers', chunkId: number): string {
    return path.join(cacheDir, kind, `${pad(chunkId)}.jsonl`);
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
    if (fs.existsSync(p)) {
        const m = JSON.parse(fs.readFileSync(p, 'utf8')) as Manifest;
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
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(restored, null, 2));
    return restored;
}

// Writes local (primary, always) AND mirrors to R2 (backup). The R2 write
// is still a real network call every time — unavoidable, since a backup
// that's never written can't restore anything — but it happens once per
// chunk during backfill, never on a read path.
export async function saveManifest(r2: R2Config, cacheDir: string, manifest: Manifest): Promise<void> {
    const withTs: Manifest = { ...manifest, updatedAt: new Date().toISOString() };
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(manifestPath(cacheDir), JSON.stringify(withTs, null, 2));
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
    if (fs.existsSync(p)) {
        return decodeJsonl(fs.readFileSync(p, 'utf8'));
    }
    const compressed = await getObject(r2, `${kind}/${pad(chunkId)}.jsonl.zst`);
    if (compressed === null) return null;
    const text = zstdDecompress(compressed);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
    return decodeJsonl(text);
}

// Writes local (primary — this IS what the wrapper will read, uncompressed,
// no R2 round-trip ever needed for it) and uploads a zstd-compressed backup
// copy to R2. Called once per chunk, ever (chunks are immutable once
// ingested — see ingest.ts's "only ingest a chunk once fully behind tip").
export async function writeChunk(
    r2: R2Config,
    cacheDir: string,
    kind: 'block_results' | 'block_headers',
    chunkId: number,
    rows: unknown[],
): Promise<void> {
    const text = encodeJsonl(rows);
    const p = chunkPath(cacheDir, kind, chunkId);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
    await putObject(r2, `${kind}/${pad(chunkId)}.jsonl.zst`, zstdCompress(text));
}
