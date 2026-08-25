import { ChainClient } from '../chain/client';
import { archiveConfig, liveChainUrls } from './config';
import { loadManifest, saveManifest, writeChunk } from './localArchive';
import type { Manifest } from './lib/manifest';
import { stripBlockResults } from './lib/strip';
import { toJsonSafe } from './lib/jsonSafe';
import { chunkIdOf, chunkRange } from './lib/chunk';
import { parallelMap } from './lib/parallelMap';

// One-time-then-idle backfill + ongoing tip-follow for block_results/block_headers.
// Run via `npm run archive-sync` (backend/archive/entrySync.ts).
//
// Local disk (ARCHIVE_CACHE_DIR) is the PRIMARY write target — R2 only gets
// a backup copy (lead dev's call, 2026-08-25: the whole archive is ~23-28 GB,
// trivial for a server's disk, and every R2 request costs something even
// though egress is free, so normal operation shouldn't need R2 at all after
// the initial write). See localArchive.ts's header for the full reasoning.
// This DOES mean the ingester must write to the same disk/volume the
// wrapper (archive/server.ts) reads from — no longer "any machine with the
// R2 credentials" the way a pure-R2 design would allow; that portability
// was traded away on purpose for the cost win.
//
// Only ever ingests a chunk once ALL of its heights are behind the live
// tip — never writes a partial trailing chunk. That keeps "a chunk exists
// on disk" == "that chunk is finished and immutable" always true, which is
// what the wrapper's reads rely on.

function range(from: number, to: number): number[] {
    const out: number[] = [];
    for (let h = from; h <= to; h++) out.push(h);
    return out;
}

// Pure: given how far the manifest has gotten and the live tip, decides
// whether there's a full chunk ready to ingest. Split out from
// runArchiveIngest so the "only ingest a chunk once it's fully behind the
// tip" boundary logic is unit-testable without local disk/R2/RPC — see
// ingest.test.ts.
export function nextChunkToIngest(
    startHeight: number,
    completeThroughHeight: number | null,
    tip: number,
): { from: number; to: number } | null {
    const nextHeight = (completeThroughHeight ?? startHeight - 1) + 1;
    const { from, to } = chunkRange(chunkIdOf(nextHeight));
    return to > tip ? null : { from, to };
}

export interface IngestStats {
    chunksWritten: number;
    heightsWritten: number;
    caughtUp: boolean; // true once nextHeight > tip (nothing more to do this pass)
}

// Fetches+strips+writes every chunk that is fully behind the tip, starting
// from wherever the manifest left off. Returns once caught up (does not
// loop/sleep itself — jobs/scheduler.ts-style polling belongs to the caller,
// see entrySync.ts).
export async function runArchiveIngest(): Promise<IngestStats> {
    const live = new ChainClient(liveChainUrls.rpcUrl, liveChainUrls.lcdUrl);
    const manifest = await loadManifest(archiveConfig.r2, archiveConfig.cacheDir, archiveConfig.startHeight);

    const stats: IngestStats = { chunksWritten: 0, heightsWritten: 0, caughtUp: false };

    for (;;) {
        const tip = (await live.getStatus()).syncInfo.latestBlockHeight;
        const next = nextChunkToIngest(archiveConfig.startHeight, manifest.completeThroughHeight, tip);
        if (next === null) {
            stats.caughtUp = true;
            return stats;
        }

        await ingestChunk(live, manifest, next.from, next.to);
        stats.chunksWritten++;
        stats.heightsWritten += next.to - next.from + 1;
    }
}

async function ingestChunk(
    live: ChainClient,
    manifest: Manifest,
    from: number,
    to: number,
): Promise<void> {
    const heights = range(from, to);
    const results = await parallelMap(heights, archiveConfig.concurrency, async (h) => {
        const [blockResults, block] = await Promise.all([live.getBlockResults(h), live.getBlock(h)]);
        return {
            blockResultsRow: toJsonSafe(stripBlockResults(blockResults)),
            headerRow: toJsonSafe({ height: h, blockId: block.blockId, header: block.block.header }),
        };
    });

    const chunkId = chunkIdOf(from);
    await writeChunk(
        archiveConfig.r2,
        archiveConfig.cacheDir,
        'block_results',
        chunkId,
        results.map((r) => r.blockResultsRow),
    );
    await writeChunk(
        archiveConfig.r2,
        archiveConfig.cacheDir,
        'block_headers',
        chunkId,
        results.map((r) => r.headerRow),
    );

    // Manifest write is LAST and deliberately sequenced after both chunk
    // writes land (local + R2 backup) — "completeThroughHeight advanced"
    // must never be true for a chunk that isn't durably on disk yet. If
    // this process dies between the writeChunk calls and the manifest
    // save, the next run just refetches and rewrites the same chunk
    // (both the local write and the R2 PUT are plain overwrites) —
    // CHUNK_SIZE re-fetches, not a correctness problem.
    manifest.completeThroughHeight = to;
    await saveManifest(archiveConfig.r2, archiveConfig.cacheDir, manifest);
}
