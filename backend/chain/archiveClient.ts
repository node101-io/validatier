import { fetchJsonWithRetry } from './http';
import type { ChainSource } from './client';

// Talks to the archive wrapper (backend/archive/server.ts), not the live
// chain. The wrapper serves plain JSON over HTTP — it does NOT speak
// CometBFT's JSON-RPC protocol, so this is a small hand-rolled client, not
// a cosmjs Comet38Client pointed at a different URL. See the archive plan
// §5 for why: cosmjs's decoder is strict about the full `/block` shape
// (signatures, last_commit, evidence) that we deliberately don't store.
//
// This is the ONLY thing the running dashboard backend talks to for chain
// data — see chain/client.ts's `chainClient` singleton, which is this
// class, not the live-chain ChainClient. The one-time archive backfill
// (backend/archive/ingest.ts) is the one process that still constructs a
// live ChainClient directly; it does not use this class or the singleton.

interface WrapperStatus {
    latestBlockHeight: number;
    earliestBlockHeight: number;
}

interface WrapperHeader {
    time: string; // ISO 8601, e.g. "2026-08-24T11:41:06.613Z"
}

export class ArchiveChainClient implements ChainSource {
    constructor(private readonly archiveUrl: string) {}

    // Retry/backoff/HttpError logic lives in chain/http.ts, shared with
    // ChainClient — defaults (3 attempts, 300ms base, 2000ms on a 429,
    // 15s timeout) match what this client used before the extraction.
    private get(path: string, headers?: Record<string, string>): Promise<unknown> {
        return fetchJsonWithRetry(this.archiveUrl + path, headers);
    }

    async getStatus(): Promise<{ syncInfo: { latestBlockHeight: number } }> {
        const s = (await this.get('/status')) as WrapperStatus;
        return { syncInfo: { latestBlockHeight: s.latestBlockHeight } };
    }

    async getBlock(
        height: number,
    ): Promise<{ block: { header: { time: { getTime(): number } } } }> {
        const h = (await this.get(`/header/${height}`)) as WrapperHeader;
        return { block: { header: { time: new Date(h.time) } } };
    }

    getBlockResults(height: number): Promise<unknown> {
        return this.get(`/block_results/${height}`);
    }

    lcdGet<T>(path: string, opts?: { height?: number }): Promise<T> {
        if (opts?.height === undefined) {
            return this.get(`/lcd${path}`) as Promise<T>;
        }
        const sep = path.includes('?') ? '&' : '?';
        return this.get(`/lcd${path}${sep}height=${opts.height}`) as Promise<T>;
    }
}
