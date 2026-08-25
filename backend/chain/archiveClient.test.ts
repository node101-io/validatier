import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { ArchiveChainClient } from './archiveClient';
import { parseBlockResults, parseValidatorLifecycleEvents } from './blockResults';
import { stripBlockResults } from '../archive/lib/strip';

// Plan §7 doğrulama item 3 ("Kaynak parity"): a fake wrapper serves the SAME
// (strip-edited) fixture data ArchiveChainClient would get from the real
// wrapper, and parseBlockResults/parseValidatorLifecycleEvents must produce
// output identical to running them straight against the untouched fixture.
// This is the archiveClient half of that test; strip.test.ts already covers
// the strip-doesn't-change-parser-output half in isolation.

function fixture(name: string): unknown {
    const p = path.resolve(__dirname, '..', '..', 'chain', '__fixtures__', `${name}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function serveFakeWrapper(blockResultsByHeight: Map<number, unknown>): Promise<{
    url: string;
    close: () => void;
}> {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 'status') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ latestBlockHeight: 999999999, earliestBlockHeight: 1 }));
            return;
        }
        if (parts[0] === 'block_results' && parts.length === 2) {
            const h = Number(parts[1]);
            const row = blockResultsByHeight.get(h);
            if (!row) {
                res.writeHead(404).end();
                return;
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(row));
            return;
        }
        if (parts[0] === 'header' && parts.length === 2) {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ time: '2026-08-24T11:41:06.613Z' }));
            return;
        }
        res.writeHead(404).end();
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
        });
    });
}

const FIXTURES = ['block_32055430', 'block_32055440', 'block_32116300', 'block_32133485'];

test('ArchiveChainClient.getBlockResults + a strip-serving wrapper reproduces identical parser output', async () => {
    const byHeight = new Map<number, unknown>();
    const heightOf: Record<string, number> = {
        block_32055430: 32055430,
        block_32055440: 32055440,
        block_32116300: 32116300,
        block_32133485: 32133485,
    };
    for (const name of FIXTURES) {
        byHeight.set(heightOf[name], stripBlockResults(fixture(name)));
    }

    const { url, close } = await serveFakeWrapper(byHeight);
    try {
        const client = new ArchiveChainClient(url);
        for (const name of FIXTURES) {
            const height = heightOf[name];
            const viaArchive = await client.getBlockResults(height);
            const direct = fixture(name);
            assert.deepEqual(parseBlockResults(viaArchive), parseBlockResults(direct), name);
            assert.deepEqual(
                parseValidatorLifecycleEvents(viaArchive),
                parseValidatorLifecycleEvents(direct),
                name,
            );
        }
    } finally {
        close();
    }
});

test('ArchiveChainClient.getBlock wraps the wrapper ISO string in a Date usable via .getTime()', async () => {
    const { url, close } = await serveFakeWrapper(new Map());
    try {
        const client = new ArchiveChainClient(url);
        const block = await client.getBlock(32055430);
        assert.equal(block.block.header.time.getTime(), Date.parse('2026-08-24T11:41:06.613Z'));
    } finally {
        close();
    }
});

test('ArchiveChainClient.getStatus maps the wrapper shape to ChainSource shape', async () => {
    const { url, close } = await serveFakeWrapper(new Map());
    try {
        const client = new ArchiveChainClient(url);
        const status = await client.getStatus();
        assert.equal(status.syncInfo.latestBlockHeight, 999999999);
    } finally {
        close();
    }
});

test('a missing height surfaces as a real error, not a silently wrong value', async () => {
    const { url, close } = await serveFakeWrapper(new Map());
    try {
        const client = new ArchiveChainClient(url);
        await assert.rejects(() => client.getBlockResults(1));
    } finally {
        close();
    }
});
