import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildValidatorSinkSaleDocs, pairKey } from './validatorSinkSales';

// Pure-function tests only — the Mongo-backed atomicity/persistence coverage
// (edges + validator_sink_sales written together in one transaction) lives in
// snapshot.test.ts, since that's where the actual write now happens.

const OP_A = 'cosmosvaloper1testsinksales_a';
const OP_B = 'cosmosvaloper1testsinksales_b';
const SINK_1 = 'cosmos1sinkone';
const SINK_2 = 'cosmos1sinktwo';

const stamp = { block_height: 100, timestamp: 1000, day: 5, month: 3, year: 2026 };

test('buildValidatorSinkSaleDocs: unchanged pair produces no doc', () => {
  const edges = [{ origin: OP_A, holder: SINK_1, sink_kind: 'cex' as const, weight_prefix_sum: 500n }];
  const last = new Map([[pairKey(OP_A, SINK_1), '500']]);
  const docs = buildValidatorSinkSaleDocs(edges, last, stamp);
  assert.equal(docs.length, 0);
});

test('buildValidatorSinkSaleDocs: never-seen pair with zero cumulative produces no doc', () => {
  const edges = [{ origin: OP_A, holder: SINK_1, sink_kind: 'cex' as const, weight_prefix_sum: 0n }];
  const docs = buildValidatorSinkSaleDocs(edges, new Map(), stamp);
  assert.equal(docs.length, 0);
});

test('buildValidatorSinkSaleDocs: changed pair produces exactly one doc with the new cumulative', () => {
  const edges = [{ origin: OP_A, holder: SINK_1, sink_kind: 'cex' as const, weight_prefix_sum: 750n }];
  const last = new Map([[pairKey(OP_A, SINK_1), '500']]);
  const docs = buildValidatorSinkSaleDocs(edges, last, stamp);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].operator_address, OP_A);
  assert.equal(docs[0].sink_address, SINK_1);
  assert.equal(docs[0].cumulative_sold, '750');
  assert.equal(docs[0].sink_kind, 'cex');
  assert.deepEqual(
    { block_height: docs[0].block_height, timestamp: docs[0].timestamp, day: docs[0].day, month: docs[0].month, year: docs[0].year },
    stamp
  );
});

test('buildValidatorSinkSaleDocs: two origins selling to the same sink track independent cumulatives', () => {
  const edges = [
    { origin: OP_A, holder: SINK_1, sink_kind: 'cex' as const, weight_prefix_sum: 100n },
    { origin: OP_B, holder: SINK_1, sink_kind: 'cex' as const, weight_prefix_sum: 200n },
  ];
  const docs = buildValidatorSinkSaleDocs(edges, new Map(), stamp);
  assert.equal(docs.length, 2);
  const byOp = new Map(docs.map((d) => [d.operator_address, d.cumulative_sold]));
  assert.equal(byOp.get(OP_A), '100');
  assert.equal(byOp.get(OP_B), '200');
});

test('append-only sequencing: unchanged re-run yields no doc, changed re-run yields exactly one', () => {
  const first = buildValidatorSinkSaleDocs(
    [{ origin: OP_A, holder: SINK_2, sink_kind: 'dex' as const, weight_prefix_sum: 42n }],
    new Map(),
    stamp
  );
  assert.equal(first.length, 1);
  assert.equal(first[0].cumulative_sold, '42');

  // unchanged re-run (simulating "last stored" now being 42) -> nothing to write
  const unchanged = buildValidatorSinkSaleDocs(
    [{ origin: OP_A, holder: SINK_2, sink_kind: 'dex' as const, weight_prefix_sum: 42n }],
    new Map([[pairKey(OP_A, SINK_2), '42']]),
    { ...stamp, timestamp: 2000 }
  );
  assert.equal(unchanged.length, 0);

  // changed re-run -> exactly one new doc, carrying the new cumulative
  const changed = buildValidatorSinkSaleDocs(
    [{ origin: OP_A, holder: SINK_2, sink_kind: 'dex' as const, weight_prefix_sum: 99n }],
    new Map([[pairKey(OP_A, SINK_2), '42']]),
    { ...stamp, timestamp: 3000 }
  );
  assert.equal(changed.length, 1);
  assert.equal(changed[0].cumulative_sold, '99');
});
