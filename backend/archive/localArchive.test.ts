import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadManifest, saveManifest, readChunk, writeChunk } from './localArchive';
import type { R2Config } from './lib/r2';
import type { Manifest } from './lib/manifest';

// Fakes R2 entirely at the fetch layer (an in-memory object store keyed by
// the S3 path) so these tests never hit a network — and, critically, so
// they can assert HOW OFTEN R2 was actually called, which is the whole
// point of the local-first design (lead dev's call, 2026-08-25: normal
// reads must be zero R2 calls).
function fakeR2(): { cfg: R2Config; calls: { get: number; put: number }; restore: () => void } {
    const store = new Map<string, Buffer>();
    const cfg: R2Config = { accountId: 'acct', bucket: 'bucket', accessKeyId: 'x', secretAccessKey: 'y' };
    const calls = { get: 0, put: 0 };
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
        const u = new URL(String(input));
        const key = decodeURIComponent(u.pathname.replace(`/${cfg.bucket}/`, ''));
        const method = init?.method ?? 'GET';
        if (method === 'PUT') {
            calls.put++;
            store.set(key, Buffer.from(init!.body as Buffer));
            return new Response(null, { status: 200 });
        }
        if (method === 'GET') {
            calls.get++;
            const v = store.get(key);
            return v ? new Response(v, { status: 200 }) : new Response('not found', { status: 404 });
        }
        return new Response(null, { status: 400 });
    }) as typeof fetch;
    return { cfg, calls, restore: () => { globalThis.fetch = realFetch; } };
}

function tmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
}

test('writeChunk then readChunk round-trips purely from local disk (zero GET calls)', async () => {
    const { cfg, calls, restore } = fakeR2();
    const dir = tmpDir();
    try {
        const rows = [{ height: 1, a: 'x' }, { height: 2, a: 'y' }];
        await writeChunk(cfg, dir, 'block_results', 0, rows);
        assert.equal(calls.put, 1, 'one backup PUT on write');

        const read = await readChunk(cfg, dir, 'block_results', 0);
        assert.deepEqual(read, rows);
        assert.equal(calls.get, 0, 'read must be served from local disk, not R2');
    } finally {
        restore();
    }
});

test('readChunk on a genuine miss (nothing local, nothing in R2) returns null', async () => {
    const { cfg, restore } = fakeR2();
    const dir = tmpDir();
    try {
        assert.equal(await readChunk(cfg, dir, 'block_results', 999), null);
    } finally {
        restore();
    }
});

test('readChunk restores from the R2 backup on a local miss, and caches it locally', async () => {
    const { cfg, calls, restore } = fakeR2();
    const writerDir = tmpDir();
    const readerDir = tmpDir(); // simulates a fresh server with an empty local cache
    try {
        const rows = [{ height: 5, a: 'z' }];
        await writeChunk(cfg, writerDir, 'block_headers', 0, rows); // populates the R2 backup

        const first = await readChunk(cfg, readerDir, 'block_headers', 0);
        assert.deepEqual(first, rows);
        assert.equal(calls.get, 1, 'first read on this fresh dir must hit R2 once');

        const second = await readChunk(cfg, readerDir, 'block_headers', 0);
        assert.deepEqual(second, rows);
        assert.equal(calls.get, 1, 'second read must be served locally — no further R2 calls');
    } finally {
        restore();
    }
});

test('saveManifest then loadManifest round-trips locally (zero GET calls)', async () => {
    const { cfg, calls, restore } = fakeR2();
    const dir = tmpDir();
    try {
        const m: Manifest = {
            startHeight: 21_870_000,
            completeThroughHeight: 21_870_999,
            stakingCompleteThroughDay: null,
            updatedAt: new Date(0).toISOString(),
        };
        await saveManifest(cfg, dir, m);
        assert.equal(calls.put, 1);

        const loaded = await loadManifest(cfg, dir, 21_870_000);
        assert.equal(loaded.completeThroughHeight, 21_870_999);
        assert.equal(calls.get, 0);
    } finally {
        restore();
    }
});

test('loadManifest restores from R2 on a fresh local dir', async () => {
    const { cfg, calls, restore } = fakeR2();
    const writerDir = tmpDir();
    const readerDir = tmpDir();
    try {
        await saveManifest(cfg, writerDir, {
            startHeight: 21_870_000,
            completeThroughHeight: 21_875_999,
            stakingCompleteThroughDay: null,
            updatedAt: new Date(0).toISOString(),
        });

        const loaded = await loadManifest(cfg, readerDir, 21_870_000);
        assert.equal(loaded.completeThroughHeight, 21_875_999);
        assert.equal(calls.get, 1);
    } finally {
        restore();
    }
});

test('loadManifest with nothing anywhere returns a fresh empty manifest', async () => {
    const { cfg, restore } = fakeR2();
    const dir = tmpDir();
    try {
        const m = await loadManifest(cfg, dir, 21_870_000);
        assert.equal(m.completeThroughHeight, null);
        assert.equal(m.startHeight, 21_870_000);
    } finally {
        restore();
    }
});

test('loadManifest throws on a startHeight mismatch against the local file', async () => {
    const { cfg, restore } = fakeR2();
    const dir = tmpDir();
    try {
        await saveManifest(cfg, dir, {
            startHeight: 21_870_000,
            completeThroughHeight: null,
            stakingCompleteThroughDay: null,
            updatedAt: new Date(0).toISOString(),
        });
        await assert.rejects(() => loadManifest(cfg, dir, 22_000_000));
    } finally {
        restore();
    }
});
