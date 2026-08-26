import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import { startArchiveServer, isStakingValidatorsListPath } from './server';
import { archiveConfig } from './config';
import { writeChunk, writeStakingSnapshot } from './localArchive';
import { chunkIdOf } from './lib/chunk';

// Regression test for a real bug caught by code review: ArchiveChainClient
// encodes the requested height as a `?height=N` query param (chain/
// archiveClient.ts's lcdGet — a plain GET across the wrapper boundary has
// no other channel for it), but the real LCD only honors the
// `x-cosmos-block-height` HEADER. The /lcd passthrough here has to
// translate one into the other, or every height-scoped LCD call (the daily
// validator_stats snapshot, jobs/validatorStats.ts) silently serves
// CURRENT chain state for what was requested as historical.
//
// Stubs the upstream LCD with an in-process http server so this asserts on
// the actual outbound request the wrapper makes — not just on what it
// returns to the caller.

function serveFakeUpstreamLcd(): Promise<{
    url: string;
    close: () => void;
    lastRequest: () => { path: string; heightHeader: string | undefined } | null;
}> {
    let last: { path: string; heightHeader: string | undefined } | null = null;
    const server = http.createServer((req, res) => {
        last = {
            path: req.url ?? '',
            heightHeader: req.headers['x-cosmos-block-height'] as string | undefined,
        };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}`,
                close: () => server.close(),
                lastRequest: () => last,
            });
        });
    });
}

test('/lcd passthrough translates ?height=N into the x-cosmos-block-height header, and does not forward the raw query param', async () => {
    const upstream = await serveFakeUpstreamLcd();
    const wrapper = startArchiveServer(0, upstream.url);
    try {
        const { port } = wrapper.address() as AddressInfo;
        const res = await fetch(
            `http://127.0.0.1:${port}/lcd/cosmos/staking/v1beta1/validators?pagination.limit=500&height=20000000`,
        );
        assert.equal(res.status, 200);

        const seen = upstream.lastRequest();
        assert.ok(seen, 'wrapper must have called the upstream LCD');
        assert.equal(seen!.heightHeader, '20000000');
        assert.equal(
            seen!.path,
            '/cosmos/staking/v1beta1/validators?pagination.limit=500',
            'the synthetic height query param must not be forwarded upstream',
        );
    } finally {
        wrapper.close();
        upstream.close();
    }
});

test('/lcd passthrough with no height sends no x-cosmos-block-height header', async () => {
    const upstream = await serveFakeUpstreamLcd();
    const wrapper = startArchiveServer(0, upstream.url);
    try {
        const { port } = wrapper.address() as AddressInfo;
        await fetch(
            `http://127.0.0.1:${port}/lcd/cosmos/distribution/v1beta1/delegators/cosmos1x/withdraw_address`,
        );
        const seen = upstream.lastRequest();
        assert.equal(seen!.heightHeader, undefined);
    } finally {
        wrapper.close();
        upstream.close();
    }
});

// --- staking archive day-approximate serving (TASKS.md 11.6) -------------
//
// Fakes ONLY the R2 host at the fetch layer (real Cloudflare host derived
// from archiveConfig.r2, matching localArchive.test.ts's fakeR2 pattern) so
// writeChunk/writeStakingSnapshot's backup PUTs never hit the real bucket
// during a unit test run — everything else (the wrapper's own HTTP server,
// its passthrough calls to the fake upstream LCD below) goes through the
// REAL fetch untouched.

function stubR2Fetch(): { restore: () => void } {
    const r2Host = `${archiveConfig.r2.accountId}.r2.cloudflarestorage.com`;
    const store = new Map<string, Buffer>();
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.host !== r2Host) return realFetch(input as never, init);
        const key = decodeURIComponent(url.pathname.replace(`/${archiveConfig.r2.bucket}/`, ''));
        const method = init?.method ?? 'GET';
        if (method === 'PUT') {
            store.set(key, Buffer.from(init!.body as Buffer));
            return new Response(null, { status: 200 });
        }
        const v = store.get(key);
        return v ? new Response(v, { status: 200 }) : new Response('not found', { status: 404 });
    }) as typeof fetch;
    return { restore: () => { globalThis.fetch = realFetch; } };
}

function cleanupLocalArchiveFiles(paths: string[]): void {
    for (const p of paths) {
        try {
            fs.rmSync(p, { force: true });
        } catch {
            // best-effort cleanup
        }
    }
}

test('isStakingValidatorsListPath matches only the exact staking validators LIST path', () => {
    assert.ok(isStakingValidatorsListPath(['lcd', 'cosmos', 'staking', 'v1beta1', 'validators']));
    assert.equal(isStakingValidatorsListPath(['lcd', 'cosmos', 'staking', 'v1beta1']), false);
    assert.equal(
        isStakingValidatorsListPath(['lcd', 'cosmos', 'distribution', 'v1beta1', 'delegators']),
        false,
    );
    assert.equal(
        isStakingValidatorsListPath(['lcd', 'cosmos', 'staking', 'v1beta1', 'validators', 'extra']),
        false,
    );
});

test('serves an archived staking day for a DIFFERENT height that falls on the same UTC day (day-approximate, accepted risk per lead dev)', async () => {
    const { restore } = stubR2Fetch();
    // Synthetic, far-future values so this can never collide with real
    // archived data: height 900,000,000 is the day's ARCHIVED height,
    // 900,000,555 is a DIFFERENT height requested later, same UTC day.
    const archivedHeight = 900_000_000;
    const requestedHeight = 900_000_555;
    const day = '2099-06-15';
    const isoTime = `${day}T08:00:00.000Z`;
    const headerChunkId = chunkIdOf(archivedHeight);
    assert.equal(chunkIdOf(requestedHeight), headerChunkId, 'test setup: both heights must share a chunk');

    const paths = [
        `${archiveConfig.cacheDir}/block_headers/${String(headerChunkId).padStart(8, '0')}.jsonl`,
        `${archiveConfig.cacheDir}/staking/${day}.json`,
    ];
    try {
        await writeChunk(archiveConfig.r2, archiveConfig.cacheDir, 'block_headers', headerChunkId, [
            { height: requestedHeight, blockId: {}, header: { time: isoTime } },
        ]);
        await writeStakingSnapshot(archiveConfig.r2, archiveConfig.cacheDir, day, {
            day,
            height: archivedHeight,
            ts: Math.floor(Date.parse(isoTime) / 1000),
            validators: [{ operator_address: 'cosmosvaloper1archived', tokens: '999' }],
        });

        // Upstream must NEVER be called — a hit here would mean the archive
        // path failed silently and fell through to live passthrough.
        const upstream = await serveFakeUpstreamLcd();
        const wrapper = startArchiveServer(0, upstream.url);
        try {
            const { port } = wrapper.address() as AddressInfo;
            const res = await fetch(
                `http://127.0.0.1:${port}/lcd/cosmos/staking/v1beta1/validators?pagination.limit=500&height=${requestedHeight}`,
            );
            assert.equal(res.status, 200);
            const body = (await res.json()) as { validators: Array<{ operator_address: string; tokens: string }>; pagination: { next_key: null } };
            assert.deepEqual(body.validators, [{ operator_address: 'cosmosvaloper1archived', tokens: '999' }]);
            assert.equal(body.pagination.next_key, null);
            assert.equal(upstream.lastRequest(), null, 'the archive must have answered — upstream LCD must not have been called');
        } finally {
            wrapper.close();
            upstream.close();
        }
    } finally {
        restore();
        cleanupLocalArchiveFiles(paths);
    }
});

test('falls through to live passthrough when the header is archived but that day has no staking snapshot', async () => {
    const { restore } = stubR2Fetch();
    const height = 900_000_777;
    const day = '2099-07-01';
    const isoTime = `${day}T00:00:01.000Z`;
    const chunkId = chunkIdOf(height);
    const paths = [`${archiveConfig.cacheDir}/block_headers/${String(chunkId).padStart(8, '0')}.jsonl`];
    try {
        await writeChunk(archiveConfig.r2, archiveConfig.cacheDir, 'block_headers', chunkId, [
            { height, blockId: {}, header: { time: isoTime } },
        ]);
        // deliberately do NOT write a staking snapshot for `day`

        const upstream = await serveFakeUpstreamLcd();
        const wrapper = startArchiveServer(0, upstream.url);
        try {
            const { port } = wrapper.address() as AddressInfo;
            await fetch(
                `http://127.0.0.1:${port}/lcd/cosmos/staking/v1beta1/validators?pagination.limit=500&height=${height}`,
            );
            const seen = upstream.lastRequest();
            assert.ok(seen, 'must fall through to the live upstream when no staking snapshot exists for the day');
            assert.equal(seen!.heightHeader, String(height));
        } finally {
            wrapper.close();
            upstream.close();
        }
    } finally {
        restore();
        cleanupLocalArchiveFiles(paths);
    }
});

test('falls through to live passthrough when the height has no archived header at all', async () => {
    const upstream = await serveFakeUpstreamLcd();
    const wrapper = startArchiveServer(0, upstream.url);
    try {
        const { port } = wrapper.address() as AddressInfo;
        await fetch(
            `http://127.0.0.1:${port}/lcd/cosmos/staking/v1beta1/validators?pagination.limit=500&height=1`,
        );
        const seen = upstream.lastRequest();
        assert.ok(seen, 'must fall through to live when nothing is archived for this height');
    } finally {
        wrapper.close();
        upstream.close();
    }
});

test('a second-page request (pagination.key present) is never served from the archive', async () => {
    const { restore } = stubR2Fetch();
    const height = 900_000_888;
    const day = '2099-08-01';
    const isoTime = `${day}T00:00:01.000Z`;
    const chunkId = chunkIdOf(height);
    const paths = [
        `${archiveConfig.cacheDir}/block_headers/${String(chunkId).padStart(8, '0')}.jsonl`,
        `${archiveConfig.cacheDir}/staking/${day}.json`,
    ];
    try {
        await writeChunk(archiveConfig.r2, archiveConfig.cacheDir, 'block_headers', chunkId, [
            { height, blockId: {}, header: { time: isoTime } },
        ]);
        await writeStakingSnapshot(archiveConfig.r2, archiveConfig.cacheDir, day, {
            day,
            height,
            ts: Math.floor(Date.parse(isoTime) / 1000),
            validators: [{ operator_address: 'cosmosvaloper1x', tokens: '1' }],
        });

        const upstream = await serveFakeUpstreamLcd();
        const wrapper = startArchiveServer(0, upstream.url);
        try {
            const { port } = wrapper.address() as AddressInfo;
            await fetch(
                `http://127.0.0.1:${port}/lcd/cosmos/staking/v1beta1/validators?pagination.limit=500&pagination.key=somepage&height=${height}`,
            );
            const seen = upstream.lastRequest();
            assert.ok(seen, 'a pagination.key request must go live, never to the archive');
        } finally {
            wrapper.close();
            upstream.close();
        }
    } finally {
        restore();
        cleanupLocalArchiveFiles(paths);
    }
});
