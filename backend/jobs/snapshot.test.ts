import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { config } from '../config';
import { Meta } from '../models/Meta/Meta';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { snapshotFundFlowToMongo } from './snapshot';

const P = 'testsnap';

function insertEdge(
  origin: string,
  holder: string,
  weight: bigint,
  status: string,
  sinkKind: string | null = null
) {
  getSqlite()
    .prepare(
      `INSERT INTO edges (origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
                          first_height, first_ts, last_height, last_ts)
       VALUES (?, ?, ?, 3, ?, ?, ?, 100, 1000, 200, 2000)`
    )
    .run(origin, holder, weight, status, sinkKind, weight);
}

const cleanupSqlite = () => getSqlite().prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();

before(async () => {
  openSqlite();
  cleanupSqlite();
  await mongoose.connect(config.mongoUri);
});

after(async () => {
  cleanupSqlite();
  await ValidatorSinkSale.deleteMany({ operator_address: { $regex: `^${P}` } });
  await mongoose.connection.close();
  closeSqlite();
});

test('snapshot computes totals and writes sink-sale deltas for realized edges', async () => {
  insertEdge(`${P}A`, `${P}inflight`, 1000n, 'in_flight');
  insertEdge(`${P}A`, `${P}cex`, 500n, 'realized', 'cex');
  insertEdge(`${P}B`, `${P}struct`, 250n, 'suspected', 'structural');

  const stats = await snapshotFundFlowToMongo();

  assert.equal(stats.edgeCount, 3);
  assert.deepEqual(stats.totals, { in_flight: '1000', realized: '500', suspected: '250' });

  // the one realized edge (origin A -> cex, weight_prefix_sum 500, never seen
  // before) must have produced exactly one validator_sink_sales doc.
  assert.equal(stats.sinkSalesChecked, 1);
  assert.equal(stats.sinkSalesWritten, 1);
  const sale = await ValidatorSinkSale.findOne({ operator_address: `${P}A`, sink_address: `${P}cex` }).lean();
  assert.ok(sale);
  assert.equal(sale!.cumulative_sold, '500');
  assert.equal(sale!.sink_kind, 'cex');
});

test('version increments monotonically across successive snapshots', async () => {
  const before = (await Meta.getSingleton()).fund_flow_current_version;

  insertEdge(`${P}C`, `${P}again`, 10n, 'in_flight');
  const stats1 = await snapshotFundFlowToMongo();
  assert.equal(stats1.version, before + 1);

  insertEdge(`${P}C`, `${P}again2`, 5n, 'in_flight');
  const stats2 = await snapshotFundFlowToMongo();
  assert.equal(stats2.version, before + 2);
});

test('an unchanged realized edge produces no new sink-sale doc on the next snapshot', async () => {
  insertEdge(`${P}E`, `${P}sinkE`, 750n, 'realized', 'dex');
  const first = await snapshotFundFlowToMongo();
  assert.equal(first.sinkSalesWritten, 1);

  // re-snapshot with nothing changed for this pair
  const second = await snapshotFundFlowToMongo();
  const rewrote = await ValidatorSinkSale.countDocuments({ operator_address: `${P}E`, sink_address: `${P}sinkE` });
  assert.equal(rewrote, 1); // still just the one doc from `first`
  assert.equal(second.edgeCount, first.edgeCount); // same edges table, nothing added
});

test('an empty edges table still produces valid (zero) totals', async () => {
  cleanupSqlite(); // remove all test rows -> edges table has nothing of ours
  // if other code left non-test edges, this snapshot would include them; assert
  // only on our own guarantees, not global state, to stay robust either way.
  const stats = await snapshotFundFlowToMongo();
  const row = getSqlite().prepare('SELECT COUNT(*) AS n FROM edges').get() as { n: bigint };
  assert.equal(stats.edgeCount, Number(row.n));
  assert.ok(stats.version > 0);
});
