import fs from 'fs';
import { getObject } from '../archive/lib/r2';
import { readChunk } from '../archive/localArchive';
import { archiveConfig } from '../archive/config';

// One-off integrity check for the R2/local archive (2026-09-22): the
// original ingest had several chunks corrupted by a process getting killed
// mid fs.writeFile (fixed since — see localArchive.ts's atomicWriteFile),
// but files written before that fix stay corrupted forever until manually
// re-ingested. This scans every chunk, local disk first (R2 fallback only
// on a local miss, same as production reads) and appends every
// corrupted/missing/empty one to bad_chunks.txt AS FOUND, so partial
// progress survives a Ctrl-C. Read-only — safe to run alongside
// validatier-backend / archive-sync / the wrapper.
//
// Usage: npm run build && node dist/scripts/scanArchive.js
// Output: bad_chunks.txt in the CWD (one line per bad chunk: "<kind> <id> <reason>")

const OUT_FILE = 'bad_chunks.txt';

function appendBad(kind: string, id: number, reason: string): void {
    const line = `${kind} ${id} ${reason}`;
    console.log('BAD', line);
    fs.appendFileSync(OUT_FILE, line + '\n');
}

async function checkChunk(kind: 'block_results' | 'block_headers', id: number): Promise<void> {
    try {
        const rows = await readChunk(archiveConfig.r2, archiveConfig.cacheDir, kind, id);
        if (rows === null) {
            appendBad(kind, id, 'MISSING');
            return;
        }
        if (rows.length === 0) {
            appendBad(kind, id, 'EMPTY');
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        appendBad(kind, id, message.replace(/\s+/g, ' ').slice(0, 200));
    }
}

async function scanKind(
    kind: 'block_results' | 'block_headers',
    fromId: number,
    toId: number,
    concurrency: number,
): Promise<void> {
    let nextId = fromId;
    let checked = 0;
    const total = toId - fromId + 1;

    async function worker(): Promise<void> {
        for (;;) {
            if (nextId > toId) return;
            const id = nextId++;
            await checkChunk(kind, id);
            checked++;
            if (checked % 500 === 0) console.log(`... ${kind} ${checked}/${total} checked`);
        }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main(): Promise<void> {
    fs.writeFileSync(OUT_FILE, ''); // fresh run each time

    const manifestBuf = await getObject(archiveConfig.r2, 'index/manifest.json');
    if (manifestBuf === null) throw new Error('manifest.json not found in R2');
    const manifest = JSON.parse(manifestBuf.toString('utf8')) as {
        startHeight: number;
        completeThroughHeight: number;
    };
    const fromId = Math.floor(manifest.startHeight / 1000);
    const toId = Math.floor(manifest.completeThroughHeight / 1000);
    console.log(`archive range: chunk ${fromId}..${toId} (${toId - fromId + 1} chunks each kind)`);

    console.log('--- scanning block_results ---');
    await scanKind('block_results', fromId, toId, 12);

    console.log('--- scanning block_headers ---');
    await scanKind('block_headers', fromId, toId, 12);

    console.log('DONE. Results in', OUT_FILE);
}

main().catch((err) => {
    console.error('SCAN FAILED:', err);
    process.exit(1);
});
