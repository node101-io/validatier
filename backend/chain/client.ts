import { Comet38Client, comet38 } from "@cosmjs/tendermint-rpc";
import { config } from "../config";
import { ArchiveChainClient } from "./archiveClient";
import { HttpError, fetchJsonWithRetry } from "./http";

// two endpoints (see .env): one CometBFT RPC + one Cosmos REST (LCD), used
// only by the archive ingester (see the ChainSource comment below) — the
// running dashboard backend talks to ARCHIVE_URL instead.
// RPC (/status, /block, /block_results) goes through cosmjs's Comet38Client —
// cosmoshub runs CometBFT 0.38's unified ABCI (finalize_block_events), which is
// exactly what Comet38Client models. LCD stays a plain REST client below: cosmjs
// has no generic LCD/REST client, only protobuf-based Stargate query clients.
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-exported for callers that already do `import { HttpError } from
// './client'` (chain/client.test.ts) — the class itself now lives in
// ./http, shared with archiveClient.ts, see that file's header for why.
export { HttpError };

// The subset of ChainClient actually used by callers (jobs/blockLoop.ts,
// jobs/validatorStats.ts, chain/stakingValidators.ts, ingest/withdrawMap.ts,
// scripts/inspectValidatorTx.ts — audited exhaustively, see the archive
// plan). `getBlock`'s return only needs `header.time` downstream, and
// `getBlockResults`'s return is passed straight into parseBlockResults,
// which already declares its input `unknown` — so this interface only
// needs to be a structural supertype of what ChainClient returns, not an
// exact match of the cosmjs types.
//
// The exported `chainClient` singleton below is what every one of those
// call sites imports — it always points at the archive wrapper
// (ArchiveChainClient, chain/archiveClient.ts), never at the live chain
// directly. The one-time archive backfill (backend/archive/ingest.ts)
// talks to the live chain instead, by constructing its own
// `new ChainClient(config.rpcUrl, config.lcdUrl)` — it does not import or
// touch this singleton. See the plan's "why no CHAIN_SOURCE flag" note.
export interface ChainSource {
    getStatus(): Promise<{ syncInfo: { latestBlockHeight: number } }>;
    // `time` only needs `.getTime()` downstream (jobs/blockLoop.ts,
    // jobs/validatorStats.ts) — loosened from `Date` because cosmjs's
    // BlockResponse actually returns a readonly Date subtype that a plain
    // `Date` (what ArchiveChainClient constructs from the wrapper's ISO
    // string) doesn't structurally satisfy the other way around.
    getBlock(height: number): Promise<{ block: { header: { time: { getTime(): number } } } }>;
    getBlockResults(height: number): Promise<unknown>;
    lcdGet<T>(path: string, opts?: { height?: number }): Promise<T>;
}

export class ChainClient implements ChainSource {
    // Lazily connected + cached; cleared on failure so the next call reconnects
    // instead of forever replaying a rejected promise.
    private cometClient: Promise<Comet38Client> | null = null;

    constructor(
        private readonly rpcUrl: string,
        private readonly lcdUrl: string,
    ) {}

    // Retry on the same URL: public endpoints throw transient 5xx/timeouts.
    // The retry/backoff/HttpError logic itself lives in chain/http.ts,
    // shared with ArchiveChainClient.
    private request(
        base: string,
        path: string,
        headers?: Record<string, string>,
    ): Promise<unknown> {
        return fetchJsonWithRetry(base + path, headers, {
            attempts: RETRY_ATTEMPTS,
            baseDelayMs: RETRY_BASE_DELAY_MS,
            timeoutMs: REQUEST_TIMEOUT_MS,
        });
    }

    private getCometClient(): Promise<Comet38Client> {
        if (!this.cometClient) {
            this.cometClient = Comet38Client.connect(this.rpcUrl).catch(
                (err) => {
                    this.cometClient = null;
                    throw err;
                },
            );
        }
        return this.cometClient;
    }

    // Retries the whole RPC call (connect + request) — cosmjs throws plain
    // Errors, not HttpError, so there's no status code to branch on here.
    private async rpcCall<T>(
        fn: (client: Comet38Client) => Promise<T>,
    ): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
                return await fn(await this.getCometClient());
            } catch (err) {
                lastError = err;
                if (attempt < RETRY_ATTEMPTS) {
                    await sleep(RETRY_BASE_DELAY_MS * attempt);
                }
            }
        }
        throw new Error(
            `${RETRY_ATTEMPTS} attempts failed for RPC call against ${this.rpcUrl}: ${lastError}`,
        );
    }

    getStatus(): Promise<comet38.StatusResponse> {
        return this.rpcCall((c) => c.status());
    }

    getBlock(height: number): Promise<comet38.BlockResponse> {
        return this.rpcCall((c) => c.block(height));
    }

    // Parsing rules live in the block_results parser (task 4.2).
    getBlockResults(height: number): Promise<comet38.BlockResultsResponse> {
        return this.rpcCall((c) => c.blockResults(height));
    }

    // LCD state query; pass height for historical reads (this ChainClient
    // is only ever the LIVE chain — see this file's ChainSource comment —
    // so historical reads here need an archive-depth LCD; the running
    // dashboard backend never calls this class directly).
    lcdGet<T>(path: string, opts?: { height?: number }): Promise<T> {
        const headers =
            opts?.height !== undefined
                ? { "x-cosmos-block-height": String(opts.height) }
                : undefined;
        return this.request(this.lcdUrl, path, headers) as Promise<T>;
    }
}

// Always the archive wrapper — see the ChainSource comment above. The live
// chain (ChainClient, this file's class) is only ever constructed directly,
// by the one-time archive ingester (backend/archive/ingest.ts), which does
// not import this singleton.
export const chainClient: ChainSource = new ArchiveChainClient(config.archiveUrl);
