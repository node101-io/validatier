import http from 'node:http';
import { archiveConfig, liveChainUrls } from './config';
import { loadManifest, readChunk, readStakingSnapshot } from './localArchive';
import { chunkIdOf } from './lib/chunk';
import { formatUtcDay } from './lib/stakingDay';

// The wrapper: plain JSON over HTTP in front of the local archive
// (localArchive.ts) — NOT a CometBFT JSON-RPC mock (plan §5) —
// chain/archiveClient.ts is the only caller and it just wants plain JSON
// back.
//
// Reads go through localArchive.ts, which is local-disk-first: in normal
// operation (ingester and this wrapper sharing ARCHIVE_CACHE_DIR) every
// request here is served straight off local disk, zero R2 calls. R2 is
// only ever touched by localArchive.ts on a genuine local miss — a fresh
// server or a wiped cache dir — see that file's header for the full
// reasoning (lead dev's call, 2026-08-25).

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(payload);
}

async function readRowByHeight(
    kind: 'block_results' | 'block_headers',
    height: number,
): Promise<Record<string, unknown> | null> {
    const rows = await readChunk(archiveConfig.r2, archiveConfig.cacheDir, kind, chunkIdOf(height));
    if (rows === null) return null;
    const row = rows.find((r) => (r as { height?: unknown }).height === height);
    return (row as Record<string, unknown> | undefined) ?? null;
}

// Detects the one LCD call the staking archive (TASKS.md 11.6) backs:
// the paginated staking validators LIST, first page only (a second-page
// request never arises here — see the comment at the call site below).
// Pure/exported so the routing decision itself is unit-testable without
// spinning up an HTTP server.
export function isStakingValidatorsListPath(parts: string[]): boolean {
    return (
        parts.length === 5 &&
        parts[1] === 'cosmos' &&
        parts[2] === 'staking' &&
        parts[3] === 'v1beta1' &&
        parts[4] === 'validators'
    );
}

// Day-approximate serving (lead dev's explicit choice, 2026-08-26 — see
// stakingIngest.ts's header for the accepted-risk rationale): resolves the
// requested height to its UTC day via the archived block header, then
// serves that WHOLE day's staking snapshot regardless of whether the
// snapshot's own recorded height exactly matches the requested one. Returns
// null on any miss (header not archived yet, or that day has no staking
// snapshot yet) so the caller falls back to live passthrough.
async function tryServeArchivedStaking(height: number): Promise<{ validators: unknown[] } | null> {
    const headerRow = await readRowByHeight('block_headers', height);
    if (headerRow === null) return null;
    const time = (headerRow.header as { time?: string } | undefined)?.time;
    if (!time) return null;

    const day = formatUtcDay(Math.floor(Date.parse(time) / 1000));
    const snapshot = await readStakingSnapshot(archiveConfig.r2, archiveConfig.cacheDir, day);
    if (snapshot === null) return null;

    return { validators: (snapshot as { validators: unknown[] }).validators };
}

// lcdUrl threaded through as a parameter (default: the live chain's real
// LCD) rather than read from liveChainUrls directly inside the handler —
// so tests can point the /lcd passthrough at a local stub server instead
// of the real chain. See server.test.ts.
async function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    lcdUrl: string,
): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' });
        return;
    }

    try {
        if (parts[0] === 'status' && parts.length === 1) {
            const manifest = await loadManifest(archiveConfig.r2, archiveConfig.cacheDir, archiveConfig.startHeight);
            sendJson(res, 200, {
                latestBlockHeight: manifest.completeThroughHeight ?? archiveConfig.startHeight - 1,
                earliestBlockHeight: archiveConfig.startHeight,
            });
            return;
        }

        if (parts[0] === 'block_results' && parts.length === 2) {
            const height = Number(parts[1]);
            const row = await readRowByHeight('block_results', height);
            if (row === null) {
                sendJson(res, 404, { error: `block_results ${height} not archived yet` });
                return;
            }
            sendJson(res, 200, row);
            return;
        }

        if (parts[0] === 'header' && parts.length === 2) {
            const height = Number(parts[1]);
            const row = await readRowByHeight('block_headers', height);
            if (row === null) {
                sendJson(res, 404, { error: `header ${height} not archived yet` });
                return;
            }
            const header = row.header as { time?: string } | undefined;
            sendJson(res, 200, { time: header?.time });
            return;
        }

        if (parts[0] === 'lcd') {
            // A malformed `height` (non-integer, negative, empty) can only
            // originate from a bug — every real caller is
            // ArchiveChainClient.lcdGet, which always builds this from a
            // `number` — but forwarding it unchecked used to reach the real
            // upstream LCD as-is, which returns a generic 400/500 with no
            // trace back to "the wrapper forwarded a bad height" (caught by
            // code review). Reject at the boundary where the bad input is
            // actually known instead.
            const heightParam = url.searchParams.get('height');
            if (heightParam !== null && !/^\d+$/.test(heightParam)) {
                sendJson(res, 400, { error: `invalid height query param: ${JSON.stringify(heightParam)}` });
                return;
            }

            // Non-height LCD calls (ingest/withdrawMap.ts's withdraw_address
            // lookup) always fall through to live passthrough below — only
            // the staking validators LIST, height-scoped, is ever served
            // from the archive (TASKS.md 11.6).
            if (
                isStakingValidatorsListPath(parts) &&
                heightParam !== null &&
                !url.searchParams.has('pagination.key')
            ) {
                // pagination.key absent = first page. The archive always
                // answers with the FULL validator list and `next_key: null`
                // in one response (see below) — a real second-page request
                // can only follow a non-null next_key, which we never
                // return, so a pagination.key here would only ever come
                // from the LIVE endpoint's own pagination, not ours; if one
                // somehow arrives, falling through to live passthrough is
                // the only response that could possibly be correct for it.
                const archived = await tryServeArchivedStaking(Number(heightParam));
                if (archived !== null) {
                    sendJson(res, 200, { validators: archived.validators, pagination: { next_key: null } });
                    return;
                }
                // miss (header not archived, or that day has no staking
                // snapshot yet) — fall through to live passthrough.
            }

            // ArchiveChainClient.lcdGet encodes the requested height as a
            // `?height=N` query param (there's no other way to get it from
            // a plain GET across the wrapper boundary — see
            // chain/archiveClient.ts). The real LCD does NOT read that
            // query param; it reads the `x-cosmos-block-height` HEADER
            // (chain/client.ts's ChainClient.lcdGet). Forwarding `height=N`
            // as-is silently no-ops on the upstream LCD, which then serves
            // CURRENT state for what was requested as a historical query —
            // caught by code review, was previously untested. Must
            // translate here, and must NOT forward the synthetic `height`
            // param itself (it isn't a real LCD query param).
            const forwardedParams = new URLSearchParams(url.search);
            forwardedParams.delete('height');
            const qs = forwardedParams.toString();
            const upstream = lcdUrl + '/' + parts.slice(1).join('/') + (qs ? `?${qs}` : '');
            const upstreamRes = await fetch(
                upstream,
                heightParam !== null ? { headers: { 'x-cosmos-block-height': heightParam } } : undefined,
            );
            const body = await upstreamRes.text();
            res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(body);
            return;
        }

        sendJson(res, 404, { error: 'not found' });
    } catch (err) {
        sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
}

// port/lcdUrl default to config but are overridable so tests can bind to an
// ephemeral port (0) and point the /lcd passthrough at a local stub
// instead of the real chain — same pattern as chain/stakingValidators.ts's
// client override.
export function startArchiveServer(
    port: number = archiveConfig.port,
    lcdUrl: string = liveChainUrls.lcdUrl,
): http.Server {
    const server = http.createServer((req, res) => {
        // One line per request, once it's actually answered — this process
        // otherwise prints NOTHING while idle (unlike the ingester, it has
        // no periodic work of its own), which made it look dead/silent to
        // an operator even while correctly serving traffic.
        const start = Date.now();
        res.on('finish', () => {
            console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
        });
        void handleRequest(req, res, lcdUrl);
    });
    server.listen(port, () => {
        const actual = (server.address() as { port: number }).port;
        console.log(`archive wrapper listening on :${actual}`);
    });
    return server;
}
