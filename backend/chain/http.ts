// Shared by chain/client.ts (live ChainClient) and chain/archiveClient.ts
// (ArchiveChainClient, talks to the wrapper) — pulled out into its own file
// specifically so neither of those two ever needs to import the OTHER at
// the value level. client.ts still imports ArchiveChainClient (to build the
// `chainClient` singleton), but archiveClient.ts no longer imports anything
// from client.ts at runtime (only `type ChainSource`, which TS erases) — so
// there is exactly one live edge (client.ts -> archiveClient.ts), not a
// cycle. A real circular value-import here previously broke depending on
// which of the two modules happened to be required first (fine when
// something loaded client.ts first, a TypeError when something imported
// archiveClient.ts directly — see chain/archiveClient.test.ts, which caught it).

export class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

export async function fetchJson(
    url: string,
    headers?: Record<string, string>,
    timeoutMs = 15_000,
): Promise<unknown> {
    const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
        throw new HttpError(res.status, `HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return res.json();
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
    attempts?: number; // default 3
    baseDelayMs?: number; // default 300 — backoff for a transient (non-429) failure
    rateLimitDelayMs?: number; // default 2000 — backoff for a 429, much longer on purpose
    timeoutMs?: number; // default 15_000, per attempt
}

// The retry+backoff wrapper around fetchJson — shared by chain/client.ts's
// ChainClient (talks to the live chain) and chain/archiveClient.ts's
// ArchiveChainClient (talks to the archive wrapper). Previously duplicated
// near-identically in both (caught by code review); one copy here means a
// future change to backoff behavior (e.g. jitter) can't land in one client
// and silently miss the other.
export async function fetchJsonWithRetry(
    url: string,
    headers: Record<string, string> | undefined,
    opts: RetryOptions = {},
): Promise<unknown> {
    const attempts = opts.attempts ?? 3;
    const baseDelayMs = opts.baseDelayMs ?? 300;
    const rateLimitDelayMs = opts.rateLimitDelayMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 15_000;

    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fetchJson(url, headers, timeoutMs);
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                // 429 = rate limit: back off much longer than a transient 5xx/timeout.
                const rateLimited = err instanceof HttpError && err.status === 429;
                await sleep((rateLimited ? rateLimitDelayMs : baseDelayMs) * attempt);
            }
        }
    }
    // Preserve the real HTTP status on the final error (so callers can e.g.
    // treat a persistent 404 differently from a persistent 5xx).
    if (lastError instanceof HttpError) {
        throw new HttpError(lastError.status, `${attempts} attempts failed for ${url}: ${lastError.message}`);
    }
    throw new Error(`${attempts} attempts failed for ${url}: ${lastError}`);
}
