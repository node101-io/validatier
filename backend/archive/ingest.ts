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

        // Logged per-chunk, not just once the whole pass finishes — a
        // cold-start backfill can cover ~10,000+ chunks and take a long
        // time; an operator tailing the process log needs visible
        // progress, not a silent terminal until it's all done (raised
        // after a real run where nothing printed for the entire backfill).
        const percent = (((next.to - archiveConfig.startHeight + 1) / (tip - archiveConfig.startHeight + 1)) * 100).toFixed(2);
        console.log(`block_results backfill: heights ${next.from}-${next.to} written (${percent}% of startHeight..tip)`);
    }
}

// CometBFT server-side cap on /blockchain's range — measured 2026-09-07:
// requesting maxHeight = minHeight+999 still only returns 20 entries. Chunk
// size (lib/chunk.ts's CHUNK_SIZE = 1000) is evenly divisible by this, so
// every chunk splits into whole batches with no short last batch to special-case.
const BLOCKCHAIN_BATCH_SIZE = 20;

async function ingestChunk(
    live: ChainClient,
    manifest: Manifest,
    from: number,
    to: number,
): Promise<void> {
    const heights = range(from, to);

    // block_results has no bulk equivalent — stays 1:1 per height.
    const blockResultsRows = await parallelMap(heights, archiveConfig.concurrency, async (h) => {
        const blockResults = await live.getBlockResults(h);
        return toJsonSafe(stripBlockResults(blockResults));
    });

    // Headers via /blockchain in batches of BLOCKCHAIN_BATCH_SIZE instead of
    // one getBlock call per height — 20x fewer requests for the same data
    // (we only ever needed header.time + blockId; see chain/client.ts's
    // getBlockchain comment for the measured request-volume win this was
    // added for, caught after the ingester's real request rate against the
    // live RPC was much higher than expected).
    const batchStarts: number[] = [];
    for (let h = from; h <= to; h += BLOCKCHAIN_BATCH_SIZE) batchStarts.push(h);
    const batchedHeaderRows = await parallelMap(batchStarts, archiveConfig.concurrency, async (batchStart) => {
        const batchEnd = Math.min(batchStart + BLOCKCHAIN_BATCH_SIZE - 1, to);
        const { blockMetas } = await live.getBlockchain(batchStart, batchEnd);
        return blockMetas.map((meta) =>
            toJsonSafe({ height: meta.header.height, blockId: meta.blockId, header: meta.header }),
        );
    });
    const headerRows = batchedHeaderRows.flat();

    const chunkId = chunkIdOf(from);
    await writeChunk(archiveConfig.r2, archiveConfig.cacheDir, 'block_results', chunkId, blockResultsRows);
    await writeChunk(archiveConfig.r2, archiveConfig.cacheDir, 'block_headers', chunkId, headerRows);

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
