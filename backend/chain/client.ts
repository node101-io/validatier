import { Comet38Client, comet38 } from "@cosmjs/tendermint-rpc";
import { config } from "../config";

// two endpoints (see .env): one CometBFT RPC + one Cosmos REST (LCD).
// No URL pools — when the archive node arrives these values just change.
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

// Exported so callers can distinguish a real HTTP status (e.g. 404 meaning
// "this resource doesn't exist" — sometimes a valid signal, not a failure)
// from network-level errors (timeout, DNS, connection reset).
export class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

async function fetchJson(
    url: string,
    headers?: Record<string, string>,
): Promise<unknown> {
    const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
        throw new HttpError(
            res.status,
            `HTTP ${res.status} ${res.statusText} for ${url}`,
        );
    }
    return res.json();
}

export class ChainClient {
    // Lazily connected + cached; cleared on failure so the next call reconnects
    // instead of forever replaying a rejected promise.
    private cometClient: Promise<Comet38Client> | null = null;

    constructor(
        private readonly rpcUrl: string,
        private readonly lcdUrl: string,
    ) {}

    // Retry on the same URL: public endpoints throw transient 5xx/timeouts.
    private async request(
        base: string,
        path: string,
        headers?: Record<string, string>,
    ): Promise<unknown> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
                return await fetchJson(base + path, headers);
            } catch (err) {
                lastError = err;
                if (attempt < RETRY_ATTEMPTS) {
                    // 429 = rate limit: back off much longer than a transient 5xx
                    const rateLimited =
                        err instanceof HttpError && err.status === 429;
                    await sleep(
                        (rateLimited ? 2000 : RETRY_BASE_DELAY_MS) * attempt,
                    );
                }
            }
        }
        // Preserve the real HTTP status on the final error (so callers can
        // e.g. treat a persistent 404 differently from a persistent 5xx).
        if (lastError instanceof HttpError) {
            throw new HttpError(
                lastError.status,
                `${RETRY_ATTEMPTS} attempts failed for ${base + path}: ${lastError.message}`,
            );
        }
        throw new Error(
            `${RETRY_ATTEMPTS} attempts failed for ${base + path}: ${lastError}`,
        );
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

    // LCD state query; pass height for historical reads (archive node needed
    // for old heights — public nodes only serve recent state).
    lcdGet<T>(path: string, opts?: { height?: number }): Promise<T> {
        const headers =
            opts?.height !== undefined
                ? { "x-cosmos-block-height": String(opts.height) }
                : undefined;
        return this.request(this.lcdUrl, path, headers) as Promise<T>;
    }
}

export const chainClient = new ChainClient(config.rpcUrl, config.lcdUrl);
