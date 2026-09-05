import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import mongoose from 'mongoose';
import { config } from '../config';
import { ValidatorStats } from '../models/ValidatorStats/ValidatorStats';
import { ChainClient } from '../chain/client';
import { buildValidatorStatsOps, fetchStakeAtHeight, fetchStakeAtHeightWithRetry } from './validatorStats';

function serve(handler: http.RequestListener): Promise<{ url: string; close: () => void }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

const P = 'cosmosvaloper1teststats';

const cleanup = () => ValidatorStats.deleteMany({ operator_address: P });

before(async () => {
  await mongoose.connect(config.mongoUri);
  await cleanup();
});

after(async () => {
  await cleanup();
  await mongoose.connection.close();
});

async function applyDay(input: Parameters<typeof buildValidatorStatsOps>[0]) {
  const { ensureOp, dayWriteOp } = buildValidatorStatsOps(input);
  await ValidatorStats.bulkWrite([ensureOp], { ordered: false });
  await ValidatorStats.bulkWrite([dayWriteOp], { ordered: false });
}

test('first write in a month creates one doc with a 31-length null array, populated only at day-1 index', async () => {
  await applyDay({
    operator_address: P,
    year: 2026,
    month: 3,
    day: 5,
    ts: 1000,
    height: 100,
    total_stake: 222n,
    reward: 10n,
    commission: 1n,
  });

  const docs = await ValidatorStats.find({ operator_address: P }).lean();
  assert.equal(docs.length, 1);
  const doc = docs[0];
  assert.equal(doc.year, 2026);
  assert.equal(doc.month, 3);
  assert.equal(doc.total_stake.length, 31);
  assert.equal(doc.total_stake[4], '222');
  assert.equal(doc.total_withdrawn_reward[4], '10');
  assert.equal(doc.total_withdrawn_commission[4], '1');
  assert.equal(doc.timestamp[4], 1000);
  assert.equal(doc.block_height[4], 100);
  // untouched slots stay null, not just index 0/1/2/3 but the rest of the month too
  assert.equal(doc.total_stake[0], null);
  assert.equal(doc.total_stake[30], null);
});

test('a second day in the same month reuses the same document (no path conflict) and does not disturb the first day', async () => {
  await applyDay({
    operator_address: P,
    year: 2026,
    month: 3,
    day: 6,
    ts: 2000,
    height: 200,
    total_stake: 444n,
    reward: 20n,
    commission: 2n,
  });

  const docs = await ValidatorStats.find({ operator_address: P, year: 2026, month: 3 }).lean();
  assert.equal(docs.length, 1); // ensure-op was a no-op the second time, not a second doc
  const doc = docs[0];
  assert.equal(doc.total_stake[4], '222'); // day 5 from the previous test untouched
  assert.equal(doc.total_stake[5], '444'); // day 6 -> index 5
  assert.equal(doc.total_withdrawn_reward[5], '20');
});

test('a different month for the same validator creates a separate document', async () => {
  await applyDay({
    operator_address: P,
    year: 2026,
    month: 4,
    day: 1,
    ts: 3000,
    height: 300,
    total_stake: 666n,
    reward: 30n,
    commission: 3n,
  });

  const docs = await ValidatorStats.find({ operator_address: P }).sort({ month: 1 }).lean();
  assert.equal(docs.length, 2);
  assert.equal(docs[0].month, 3);
  assert.equal(docs[1].month, 4);
  assert.equal(docs[1].total_stake[0], '666');
});

test('fetchStakeAtHeight merges paginated pages and sends the height on every request', async () => {
  const seenHeights: Array<string | undefined> = [];
  const seenKeys: Array<string | null> = [];
  const { url, close } = await serve((req, res) => {
    seenHeights.push(req.headers['x-cosmos-block-height'] as string | undefined);
    const params = new URL(req.url ?? '', 'http://x').searchParams;
    const key = params.get('pagination.key');
    seenKeys.push(key);
    res.writeHead(200, { 'content-type': 'application/json' });
    if (key === null) {
      res.end(
        JSON.stringify({
          validators: [{ operator_address: 'cosmosvaloper1a', tokens: '111' }],
          pagination: { next_key: 'nextpage' },
        })
      );
    } else {
      assert.equal(key, 'nextpage');
      res.end(
        JSON.stringify({
          validators: [{ operator_address: 'cosmosvaloper1b', tokens: '222' }],
          pagination: { next_key: null },
        })
      );
    }
  });
  try {
    const client = new ChainClient(url, url);
    const result = await fetchStakeAtHeight(999, client);
    assert.equal(result.size, 2);
    assert.equal(result.get('cosmosvaloper1a'), 111n);
    assert.equal(result.get('cosmosvaloper1b'), 222n);
    assert.equal(seenHeights.length, 2);
    assert.ok(seenHeights.every((h) => h === '999'));
    assert.deepEqual(seenKeys, [null, 'nextpage']);
  } finally {
    close();
  }
});

test('fetchStakeAtHeight throws instead of looping forever on a non-advancing next_key', async () => {
  const { url, close } = await serve((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        validators: [{ operator_address: 'cosmosvaloper1a', tokens: '111' }],
        pagination: { next_key: 'stuck' },
      })
    );
  });
  try {
    const client = new ChainClient(url, url);
    await assert.rejects(() => fetchStakeAtHeight(999, client), /did not advance/);
  } finally {
    close();
  }
});

// Regression coverage for the code-review finding: the bulk fetch replaced
// per-validator LCD calls (each individually retried/skippable) with one
// paginated call — a single flaky page used to abort just one validator,
// now it aborts the whole day's job. fetchStakeAtHeightWithRetry adds a
// coarse retry around the whole bulk fetch so a transient outage (server
// recovers before all attempts, both the inner per-HTTP-call retries in
// chain/http.ts AND these outer ones, are exhausted) doesn't force
// blockLoop.ts to redo the entire day (including the fund-flow snapshot)
// on the very next block.
test('fetchStakeAtHeightWithRetry recovers once the endpoint starts responding again', async () => {
  let requestCount = 0;
  const { url, close } = await serve((_req, res) => {
    requestCount++;
    // Fail the first 3 real HTTP attempts (fully exhausts fetchJsonWithRetry's
    // own inner 3-attempt retry, forcing fetchStakeAtHeightWithRetry's OUTER
    // loop to actually kick in for its 2nd attempt) — succeed from the 4th on.
    if (requestCount <= 3) {
      res.writeHead(500).end('transient');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        validators: [{ operator_address: 'cosmosvaloper1a', tokens: '111' }],
        pagination: { next_key: null },
      })
    );
  });
  try {
    const client = new ChainClient(url, url);
    const result = await fetchStakeAtHeightWithRetry(999, client);
    assert.equal(result.get('cosmosvaloper1a'), 111n);
    assert.ok(requestCount >= 4, 'the outer retry must have kicked in after the inner retry exhausted');
  } finally {
    close();
  }
});

test('fetchStakeAtHeightWithRetry gives up and throws after exhausting all outer attempts', async () => {
  const { url, close } = await serve((_req, res) => {
    res.writeHead(500).end('permanently broken');
  });
  try {
    const client = new ChainClient(url, url);
    await assert.rejects(() => fetchStakeAtHeightWithRetry(999, client), /3 attempts failed/);
  } finally {
    close();
  }
});
