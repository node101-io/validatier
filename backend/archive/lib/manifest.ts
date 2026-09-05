import { getObject, putObject, type R2Config } from './r2';

// R2-side primitives for the manifest object — the backup copy, not the
// primary one. Local disk is primary (archive/localArchive.ts's
// loadManifest/saveManifest wrap these two functions with a local-first
// read and a local+R2 write); nothing outside localArchive.ts should call
// readManifest/writeManifest directly. See localArchive.ts's header for
// the full local-vs-R2 reasoning (lead dev's call, 2026-08-25).
//
// `completeThroughHeight` only ever advances (in ingest.ts) once a FULL
// 1000-block chunk (block_results AND block_headers) has been durably
// written both locally and to this R2 backup — so a crash mid-chunk just
// means that chunk gets refetched and rewritten (both writes are plain
// overwrites, objects are otherwise treated as immutable by convention,
// not by any lock).

export interface Manifest {
    startHeight: number;
    completeThroughHeight: number | null; // null = nothing archived yet
    stakingCompleteThroughDay: string | null; // 'YYYY-MM-DD', null = none yet
    updatedAt: string; // ISO
}

const MANIFEST_KEY = 'index/manifest.json';

export async function readManifest(cfg: R2Config, startHeight: number): Promise<Manifest> {
    const buf = await getObject(cfg, MANIFEST_KEY);
    if (buf === null) {
        return {
            startHeight,
            completeThroughHeight: null,
            stakingCompleteThroughDay: null,
            updatedAt: new Date(0).toISOString(),
        };
    }
    const m = JSON.parse(buf.toString('utf8')) as Manifest;
    if (m.startHeight !== startHeight) {
        throw new Error(
            `manifest startHeight mismatch: R2 has ${m.startHeight}, config says ${startHeight} — ` +
                `changing ARCHIVE_START_HEIGHT after a bucket has data requires a deliberate migration, not a silent reset`,
        );
    }
    return m;
}

export async function writeManifest(cfg: R2Config, manifest: Manifest): Promise<void> {
    await putObject(
        cfg,
        MANIFEST_KEY,
        Buffer.from(JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2)),
        'application/json',
    );
}
