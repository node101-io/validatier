import { ChainClient } from '../chain/client';
import { fetchAllStakingValidators } from '../chain/stakingValidators';
import { archiveConfig, liveChainUrls } from './config';
import { loadManifest, saveManifest, writeStakingSnapshot } from './localArchive';
import { formatUtcDay, nextStakingDayToBackfill, findFirstHeightOfDay } from './lib/stakingDay';

// The staking snapshot backfill ("Adım A", TASKS.md 11.6) — cheapest,
// highest-value step of the archive layer: opens validator_stats up to 2
// years of history for ~1,500 LCD requests total (~730 days × ~2 pages),
// versus block_results's ~1.4 TB download. Run via `npm run archive-sync`
// (entrySync.ts calls this before each block_results ingest pass).
//
// One snapshot per UTC day, at that day's FIRST block height (matches how
// the live system already operates — jobs/validatorStats.ts's
// runDailyValidatorStats is only ever called once per day, at the cursor
// height when blockLoop.ts detects the day changed, which IS the first
// block of the new day). Progress lives in the manifest's
// `stakingCompleteThroughDay`, same local-first/R2-backup pattern as
// block_results (archive/localArchive.ts).
//
// SERVING-SIDE ACCEPTED RISK (lead dev's explicit call, 2026-08-26): the
// wrapper (archive/server.ts) serves a day's snapshot for ANY height-scoped
// staking request that falls on that UTC day, not just the exact height
// recorded here. If a delegation/undelegation happens later the same day,
// a request for a later height on that day gets the EARLIER (first-block)
// stake figure. This was a deliberate choice, not an oversight — validator
// stake already only gets ONE data point per day everywhere else in this
// system (see the DailyStatsResult comment above), so the existing design
// already treats "a day" as the unit of precision, not "a block".

interface StakingSnapshot {
    day: string;
    height: number;
    ts: number;
    validators: Array<{ operator_address: string; tokens: string }>;
}

export interface StakingBackfillStats {
    daysWritten: number;
}

export async function runStakingBackfill(): Promise<StakingBackfillStats> {
    const live = new ChainClient(liveChainUrls.rpcUrl, liveChainUrls.lcdUrl);
    const manifest = await loadManifest(archiveConfig.r2, archiveConfig.cacheDir, archiveConfig.startHeight);

    const getTime = async (height: number): Promise<number> =>
        Math.floor((await live.getBlock(height)).block.header.time.getTime() / 1000);

    const startDay = formatUtcDay(await getTime(archiveConfig.startHeight));
    const tip = (await live.getStatus()).syncInfo.latestBlockHeight;
    const tipDay = formatUtcDay(await getTime(tip));

    const stats: StakingBackfillStats = { daysWritten: 0 };
    let lo = archiveConfig.startHeight; // monotonic: each day's height is >= the previous day's

    for (;;) {
        const day = nextStakingDayToBackfill(startDay, manifest.stakingCompleteThroughDay, tipDay);
        if (day === null) return stats;

        const { height, ts } = await findFirstHeightOfDay(getTime, day, lo, tip);
        const validators = await fetchAllStakingValidators<{ operator_address: string; tokens: string }>({
            height,
            client: live,
        });

        const snapshot: StakingSnapshot = { day, height, ts, validators };
        await writeStakingSnapshot(archiveConfig.r2, archiveConfig.cacheDir, day, snapshot);

        manifest.stakingCompleteThroughDay = day;
        await saveManifest(archiveConfig.r2, archiveConfig.cacheDir, manifest);

        lo = height;
        stats.daysWritten++;
        // Logged per-day, not just once the whole backfill finishes —
        // the outer loop (entrySync.ts) only prints a summary AFTER this
        // function returns, which for a ~730-day cold-start backfill can
        // be a long time; an operator tailing the process log needs to
        // see it's actually moving, not just alive/dead (raised after a
        // real run where the terminal sat silent for the entire backfill).
        console.log(`staking backfill: day ${day} -> height ${height} (${validators.length} validators)`);
    }
}
