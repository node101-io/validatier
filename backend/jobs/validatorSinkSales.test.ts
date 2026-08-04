import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { config } from '../config';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { buildValidatorSinkSaleDocs, pairKey } from './validatorSinkSales';

const OP_A = 'cosmosvaloper1testsinksales_a';
const OP_B = 'cosmosvaloper1testsinksales_b';
const SINK_1 = 'cosmos1sinkone';
const SINK_2 = 'cosmos1sinktwo';

const cleanup = () =>
  ValidatorSinkSale.deleteMany({ operator_address: { $in: [OP_A, OP_B] } });

before(async () => {
  await mongoose.connect(config.mongoUri);
  await cleanup();
});

after(async () => {
  await cleanup();
  await mongoose.connection.close();
});

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

test('append-only: writing an unchanged pair leaves the collection doc count stable, a changed pair adds exactly one new doc', async () => {
  const first = buildValidatorSinkSaleDocs(
    [{ origin: OP_A, holder: SINK_2, sink_kind: 'dex' as const, weight_prefix_sum: 42n }],
    new Map(),
    stamp
  );
  await ValidatorSinkSale.insertMany(first, { ordered: false });
  let docs = await ValidatorSinkSale.find({ operator_address: OP_A, sink_address: SINK_2 }).lean();
  assert.equal(docs.length, 1);

  // unchanged re-run -> buildValidatorSinkSaleDocs itself filters it out, nothing to insert
  const unchanged = buildValidatorSinkSaleDocs(
    [{ origin: OP_A, holder: SINK_2, sink_kind: 'dex' as const, weight_prefix_sum: 42n }],
    new Map([[pairKey(OP_A, SINK_2), '42']]),
    { ...stamp, timestamp: 2000 }
  );
  assert.equal(unchanged.length, 0);

  // changed re-run -> exactly one new doc, old one untouched
  const changed = buildValidatorSinkSaleDocs(
    [{ origin: OP_A, holder: SINK_2, sink_kind: 'dex' as const, weight_prefix_sum: 99n }],
    new Map([[pairKey(OP_A, SINK_2), '42']]),
    { ...stamp, timestamp: 3000 }
  );
  await ValidatorSinkSale.insertMany(changed, { ordered: false });
  docs = await ValidatorSinkSale.find({ operator_address: OP_A, sink_address: SINK_2 })
    .sort({ timestamp: 1 })
    .lean();
  assert.equal(docs.length, 2);
  assert.equal(docs[0].cumulative_sold, '42');
  assert.equal(docs[1].cumulative_sold, '99');
});
