import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBlockResults, parseValidatorLifecycleEvents } from '../../chain/blockResults';
import { stripBlockResults, STRIPPED_EVENT_TYPES } from './strip';

// The contract: strip.ts must be a no-op as far as the parser is concerned.
// Every real cosmoshub fixture in the repo is run through both the
// untouched and the stripped shape; the parser's output must be identical.
// If this test ever fails, the strip list in strip.ts is wrong and must not
// be shipped — see that file's header.

function fixture(name: string): unknown {
    const p = path.resolve(__dirname, '..', '..', '..', 'chain', '__fixtures__', `${name}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const FIXTURES = [
    'block_32055430', // update_client, coin_spent/received, tx.log all present
    'block_32055440', // withdraw_rewards reward-claim tagging
    'block_32116300', // ibc_transfer, update_client, packet events
    'block_32133485', // set_withdraw_address lifecycle event
];

for (const name of FIXTURES) {
    test(`strip parity: ${name} — parseBlockResults output unchanged`, () => {
        const raw = fixture(name);
        const stripped = stripBlockResults(raw);
        assert.deepEqual(parseBlockResults(stripped), parseBlockResults(raw));
    });

    test(`strip parity: ${name} — parseValidatorLifecycleEvents output unchanged`, () => {
        const raw = fixture(name);
        const stripped = stripBlockResults(raw);
        assert.deepEqual(parseValidatorLifecycleEvents(stripped), parseValidatorLifecycleEvents(raw));
    });
}

test('strip actually removes the targeted event types (sanity: the test above is not vacuous)', () => {
    const raw = fixture('block_32055430') as {
        results: Array<{ events: Array<{ type: string }> }>;
    };
    const before = raw.results.flatMap((tx) => tx.events.map((e) => e.type));
    assert.ok(before.some((t) => STRIPPED_EVENT_TYPES.has(t)), 'fixture must exercise a stripped type');

    const stripped = stripBlockResults(raw) as typeof raw;
    const after = stripped.results.flatMap((tx) => tx.events.map((e) => e.type));
    assert.ok(after.every((t) => !STRIPPED_EVENT_TYPES.has(t)));
});

test('strip drops tx.log / tx.data / tx.info but keeps other tx fields (e.g. code)', () => {
    const raw = fixture('block_32055430') as { results: Array<Record<string, unknown>> };
    // fixture `log` fields were trimmed empty when captured (see blockResults.test.ts
    // header) — assert on `data`, which is populated, to keep this check non-vacuous.
    assert.ok(raw.results.some((tx) => typeof tx.data === 'string' && tx.data.length > 0));

    const stripped = stripBlockResults(raw) as { results: Array<Record<string, unknown>> };
    for (const tx of stripped.results) {
        assert.equal(tx.log, undefined);
        assert.equal(tx.data, undefined);
        assert.equal(tx.info, undefined);
        assert.equal(typeof tx.code, 'number');
    }
});

test('handles a block with no txs (results null/empty) without throwing', () => {
    const stripped = stripBlockResults({ height: '1', results: null, finalizeBlockEvents: [] });
    assert.equal(stripped.results, null);
    assert.deepEqual(stripped.finalizeBlockEvents, []);
});
