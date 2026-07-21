import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { config } from '../config';
import { FundFlowEdge } from '../models/FundFlowEdge/FundFlowEdge';
import { Meta } from '../models/Meta/Meta';
import { snapshotFundFlowToMongo } from './snapshot';

const P = 'testsnap';
const versionsCreated: number[] = [];

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
  if (versionsCreated.length > 0) {
    await FundFlowEdge.deleteMany({ version: { $in: versionsCreated } });
  }
  await mongoose.connection.close();
  closeSqlite();
});

test('snapshot writes published edges, correct field mapping, and totals', async () => {
  insertEdge(`${P}A`, `${P}inflight`, 1000n, 'in_flight');
  insertEdge(`${P}A`, `${P}cex`, 500n, 'realized', 'cex');
  insertEdge(`${P}B`, `${P}struct`, 250n, 'suspected', 'structural');

  const stats = await snapshotFundFlowToMongo();
  versionsCreated.push(stats.version);

  assert.equal(stats.edgeCount, 3);
  assert.deepEqual(stats.totals, { in_flight: '1000', realized: '500', suspected: '250' });

  const docs = await FundFlowEdge.find({ version: stats.version }).lean();
  assert.equal(docs.length, 3);
  assert.ok(docs.every((d) => d.published === true)); // commit switch flipped for all

  const cex = docs.find((d) => d.holder === `${P}cex`)!;
  assert.equal(cex.weight, '500'); // BigInt -> string
  assert.equal(cex.weight_prefix_sum, '500');
  assert.equal(cex.status, 'realized');
  assert.equal(cex.sink_tier, 1); // derived from status, not a SQLite column
  assert.equal(cex.sink_kind, 'cex');
  assert.equal(cex.depth, 3);
  assert.equal(cex.first_seen_height, 100);
  assert.equal(cex.last_update_timestamp, 2000);

  const struct = docs.find((d) => d.holder === `${P}struct`)!;
  assert.equal(struct.sink_tier, 2); // suspected -> tier 2

  const plain = docs.find((d) => d.holder === `${P}inflight`)!;
  assert.equal(plain.sink_tier, null);
  assert.equal(plain.sink_kind, null);
});

test('meta pointer only advances to a version whose edges are already published', async () => {
  const meta = await Meta.getSingleton();
  const lastVersion = versionsCreated[versionsCreated.length - 1];
  assert.equal(meta.fund_flow_current_version, lastVersion);

  const unpublished = await FundFlowEdge.countDocuments({
    version: meta.fund_flow_current_version,
    published: false,
  });
  assert.equal(unpublished, 0); // nothing left unpublished at the version meta points to
});

test('version increments monotonically across successive snapshots', async () => {
  const before = (await Meta.getSingleton()).fund_flow_current_version;

  insertEdge(`${P}C`, `${P}again`, 10n, 'in_flight');
  const stats1 = await snapshotFundFlowToMongo();
  versionsCreated.push(stats1.version);
  assert.equal(stats1.version, before + 1);

  insertEdge(`${P}C`, `${P}again2`, 5n, 'in_flight');
  const stats2 = await snapshotFundFlowToMongo();
  versionsCreated.push(stats2.version);
  assert.equal(stats2.version, before + 2);

  // each version is an independent full copy — v1 only has what existed at that time
  const v1count = await FundFlowEdge.countDocuments({ version: stats1.version });
  const v2count = await FundFlowEdge.countDocuments({ version: stats2.version });
  assert.ok(v2count > v1count); // v2 includes the previously-snapshotted edges too
});

test('an empty edges table still produces a valid (empty) published version', async () => {
  cleanupSqlite(); // remove all test rows -> edges table has nothing of ours
  // if other code left non-test edges, this snapshot would include them; assert
  // only on our own guarantees, not global state, to stay robust either way.
  const stats = await snapshotFundFlowToMongo();
  versionsCreated.push(stats.version);
  const row = getSqlite().prepare('SELECT COUNT(*) AS n FROM edges').get() as { n: bigint };
  assert.equal(stats.edgeCount, Number(row.n));
  assert.ok(stats.version > 0);
});
