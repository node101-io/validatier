import { config as appConfig } from '../config'; // side-effect: loads .env once (dotenv.config)
import type { R2Config } from './lib/r2';

// Ingester/wrapper-only config — deliberately NOT part of ../config.ts's
// `Config`, so the dashboard backend (which only ever talks to the archive
// wrapper, chain/client.ts's `chainClient`) never has to have R2 credentials
// present just to boot. Only the two archive/ entrypoints (ingest.ts,
// server.ts) import this file.

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required env var: ${name} (see .env.example)`);
    }
    return value;
}

function requireInt(name: string): number {
    const raw = requireEnv(name);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Env var ${name} must be a non-negative integer, got "${raw}"`);
    }
    return value;
}

export interface ArchiveConfig {
    r2: R2Config;
    // 21,870,000 — measured (plan §1.2) as the first height where every tx
    // `transfer` event reliably carries `msg_index`, which the SDK v0.47
    // upgrade introduced somewhere in 21,830,000–21,870,000. Below this,
    // parseBlockResults's fee/tip-vs-real-transfer disambiguation (CLAUDE.md
    // gotcha #1) silently breaks — never backfill below it without first
    // revisiting that boundary.
    startHeight: number;
    concurrency: number;
    port: number; // archive/server.ts (the wrapper) HTTP port
    // PRIMARY storage, not a cache — the ingester writes here, the wrapper
    // reads from here; R2 only gets touched on a genuine local miss (fresh
    // server / wiped dir). See archive/localArchive.ts. Ingester and
    // wrapper MUST point this at the same disk/volume.
    cacheDir: string;
}

export const archiveConfig: ArchiveConfig = {
    r2: {
        accountId: requireEnv('R2_ACCOUNT_ID'),
        bucket: requireEnv('R2_BUCKET'),
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
    startHeight: requireInt('ARCHIVE_START_HEIGHT'),
    concurrency: requireInt('ARCHIVE_INGEST_CONCURRENCY'),
    port: requireInt('ARCHIVE_SERVER_PORT'),
    cacheDir: process.env.ARCHIVE_CACHE_DIR?.trim() || './data/archive-cache',
};

// re-exported so ingest.ts can build its own live ChainClient without a
// second import of ../config
export const liveChainUrls = { rpcUrl: appConfig.rpcUrl, lcdUrl: appConfig.lcdUrl };
