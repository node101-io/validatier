import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { startArchiveServer } from './server';

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
