import { config } from "../config";

// two endpoints (see .env): one CometBFT RPC + one Cosmos REST (LCD).
// No URL pools — when the archive node arrives these values just change.
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

    // CometBFT RPC wraps every response in {jsonrpc, id, result | error}.
    private async rpcGet<T>(path: string): Promise<T> {
        const body = (await this.request(this.rpcUrl, path)) as {
            result?: T;
            error?: { code: number; message: string; data?: string };
        };
        if (body.error) {
            throw new Error(
                `rpc error for ${path}: ${body.error.message} ${body.error.data ?? ""}`,
            );
        }
        if (body.result === undefined) {
            throw new Error(`rpc: malformed response for ${path} (no result)`);
        }
        return body.result;
    }

    getStatus(): Promise<RpcStatus> {
        return this.rpcGet<RpcStatus>("/status");
    }

    getBlock(height: number): Promise<RpcBlock> {
        return this.rpcGet<RpcBlock>(`/block?height=${height}`);
    }

    // Raw shape; parsing rules live in the block_results parser (task 4.2).
    getBlockResults(height: number): Promise<unknown> {
        return this.rpcGet<unknown>(`/block_results?height=${height}`);
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

// Only the fields we actually read are typed; both endpoints return much more.
export interface RpcStatus {
    sync_info: {
        latest_block_height: string; // numbers arrive as strings in CometBFT JSON
        latest_block_time: string;
        catching_up: boolean;
    };
}

export interface RpcBlock {
    block: {
        header: {
            height: string;
            time: string; // RFC3339 — the block timestamp we persist as unix sec
        };
    };
}

export const chainClient = new ChainClient(config.rpcUrl, config.lcdUrl);
