import { runArchiveIngest } from './ingest';

// `npm run archive-sync` — self-rescheduling loop, same shape as
// jobs/scheduler.ts (no fixed-interval timer stacking, one pass finishes
// fully before the next is scheduled). Runs forever: does a full backfill
// pass (however many chunks are behind the tip), then polls for new chunks
// every POLL_INTERVAL_MS once caught up. Kill and restart freely — progress
// lives in manifest.json on local disk (ARCHIVE_CACHE_DIR), backed up to
// R2, not in this process — see archive/localArchive.ts.

const POLL_INTERVAL_MS = 30_000; // ~5 cosmoshub blocks' worth of margin past one chunk's worth of new blocks

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
    console.log('archive ingester starting');
    for (;;) {
        try {
            const stats = await runArchiveIngest();
            if (stats.chunksWritten > 0) {
                console.log(
                    `archive ingest: wrote ${stats.chunksWritten} chunk(s), ${stats.heightsWritten} heights`,
                );
            }
        } catch (err) {
            console.error('archive ingest pass failed (will retry):', err);
        }
        await sleep(POLL_INTERVAL_MS);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
