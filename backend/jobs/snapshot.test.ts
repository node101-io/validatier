import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { config } from '../config';
import { FundFlowEdge } from '../models/FundFlowEdge/FundFlowEdge';
import { ValidatorSinkSale } from '../models/ValidatorSinkSale/ValidatorSinkSale';
import { filterChangedEdges, snapshotFundFlowToMongo } from './snapshot';

// ── Pure-function tests (safe: no I/O, no shared state) ─────────────────
// Mirrors this repo's convention (e.g. blockLoop.test.ts's computeFromHeight)
// of unit-testing extracted pure logic directly, specifically so the delta
// filter's correctness doesn't depend on manipulating the shared live
// SQLite cursor (store/meta.ts's getCursor/advanceCursor) that a real
// blockLoop process also reads/writes — doing that from a test would risk
// corrupting the actual backfill's progress, not just being slow.

test('filterChangedEdges: keeps only rows with last_height strictly above the threshold', () => {
  const rows = [
    { id: 'a', last_height: 100n },
    { id: 'b', last_height: 200n },
    { id: 'c', last_height: 201n },
  ];
  const result = filterChangedEdges(rows, 200);
  assert.deepEqual(
    result.map((r) => r.id),
    ['c']
  );
});

test('filterChangedEdges: equal-to-threshold is excluded, not included', () => {
  const rows = [{ id: 'a', last_height: 200n }];
  assert.equal(filterChangedEdges(rows, 200).length, 0);
});

test('filterChangedEdges: previousCursorHeight=0 (first-ever run) includes every real edge', () => {
  const rows = [
    { id: 'a', last_height: 1n },
    { id: 'b', last_height: 999999n },
  ];
  assert.equal(filterChangedEdges(rows, 0).length, 2);
});

// ── Integration tests against the shared live Mongo + SQLite ────────────
// NOTE: snapshotFundFlowToMongo() reads/mirrors the ENTIRE SQLite `edges`
// table (not just this file's `testsnap*` rows) and reads/advances the
// Mongo Meta singleton's `scanned_up_to_height`/`fund_flow_current_version`
// fields — the SAME document the live dashboard reads. NEVER call
// store/meta.ts's advanceCursor() from this file: that mutates the SHARED
// SQLite cursor a live blockLoop process also reads, which would corrupt
// real backfill progress, not just pollute test data. Because this
// exercises live shared state, these tests are not run in this session
// (project convention: don't run tests that write to a SQLite file / Mongo
// doc a live process has open) — kept as documentation-quality coverage.
//
// Every test edge uses an enormous last_height (far above any real
// cosmoshub block height, ~33M as of 2026-09) so it's unconditionally
// "changed" under the delta filter regardless of whatever the real,
// ever-advancing production cursor happens to be — this avoids needing to
// know or control that value.

const P = 'testsnap';
const HUGE_HEIGHT = 99_999_999_999;

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
       VALUES (?, ?, ?, 3, ?, ?, ?, 100, 1000, ?, ?)
       ON CONFLICT(origin, holder) DO UPDATE SET
         weight = excluded.weight, status = excluded.status, sink_kind = excluded.sink_kind,
         weight_prefix_sum = excluded.weight_prefix_sum,
         last_height = excluded.last_height, last_ts = excluded.last_ts`
    )
    .run(origin, holder, weight, status, sinkKind, HUGE_HEIGHT, HUGE_HEIGHT);
}

function deleteEdge(origin: string, holder: string) {
  getSqlite().prepare('DELETE FROM edges WHERE origin = ? AND holder = ?').run(origin, holder);
}

const cleanupSqlite = () => getSqlite().prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();
const cleanupMongo = () => FundFlowEdge.deleteMany({ origin: { $regex: `^${P}` } });

before(async () => {
  openSqlite();
  cleanupSqlite();
  await mongoose.connect(config.mongoUri);
  await cleanupMongo();
});

after(async () => {
  cleanupSqlite();
  await cleanupMongo();
  await ValidatorSinkSale.deleteMany({ operator_address: { $regex: `^${P}` } });
  await mongoose.connection.close();
  closeSqlite();
});

test('snapshot upserts edges by (origin, holder), computes totals, writes sink-sale deltas', async () => {
  insertEdge(`${P}A`, `${P}inflight`, 1000n, 'in_flight');
  insertEdge(`${P}A`, `${P}cex`, 500n, 'realized', 'cex');
  insertEdge(`${P}B`, `${P}struct`, 250n, 'suspected', 'structural');

  const stats = await snapshotFundFlowToMongo();

  assert.deepEqual(stats.totals, { in_flight: '1000', realized: '500', suspected: '250' });

  const inflight = await FundFlowEdge.findOne({ origin: `${P}A`, holder: `${P}inflight` }).lean();
  assert.ok(inflight);
  assert.equal(inflight!.weight, '1000');
  assert.equal(inflight!.status, 'in_flight');
  assert.equal(inflight!.sink_tier, null);

  const cex = await FundFlowEdge.findOne({ origin: `${P}A`, holder: `${P}cex` }).lean();
  assert.ok(cex);
  assert.equal(cex!.sink_tier, 1); // realized -> tier 1

  // the one realized edge (origin A -> cex, weight_prefix_sum 500, never seen
  // before) must have produced exactly one validator_sink_sales doc.
  assert.equal(stats.sinkSalesChecked, 1);
  assert.equal(stats.sinkSalesWritten, 1);
  const sale = await ValidatorSinkSale.findOne({ operator_address: `${P}A`, sink_address: `${P}cex` }).lean();
  assert.ok(sale);
  assert.equal(sale!.cumulative_sold, '500');
});

test('re-snapshotting a changed edge updates the SAME doc in place, no new copy', async () => {
  insertEdge(`${P}C`, `${P}holder`, 10n, 'in_flight');
  await snapshotFundFlowToMongo();
  const firstDoc = await FundFlowEdge.findOne({ origin: `${P}C`, holder: `${P}holder` }).lean();

  insertEdge(`${P}C`, `${P}holder`, 25n, 'in_flight'); // weight changed, last_height still HUGE_HEIGHT
  await snapshotFundFlowToMongo();

  const count = await FundFlowEdge.countDocuments({ origin: `${P}C`, holder: `${P}holder` });
  assert.equal(count, 1); // still exactly one doc, not two
  const updatedDoc = await FundFlowEdge.findOne({ origin: `${P}C`, holder: `${P}holder` }).lean();
  assert.equal(updatedDoc!._id.toString(), firstDoc!._id.toString()); // same doc, updated
  assert.equal(updatedDoc!.weight, '25');
});

test('an edge removed from SQLite (contraction zeroed it out) is deleted from Mongo too', async () => {
  insertEdge(`${P}D`, `${P}gone`, 5n, 'in_flight');
  await snapshotFundFlowToMongo();
  assert.ok(await FundFlowEdge.findOne({ origin: `${P}D`, holder: `${P}gone` }).lean());

  deleteEdge(`${P}D`, `${P}gone`);
  const stats = await snapshotFundFlowToMongo();

  assert.equal(await FundFlowEdge.findOne({ origin: `${P}D`, holder: `${P}gone` }).lean(), null);
  assert.ok(stats.edgesDeleted >= 1);
});

test('an unchanged realized edge produces no new sink-sale doc on the next snapshot', async () => {
  insertEdge(`${P}E`, `${P}sinkE`, 750n, 'realized', 'dex');
  const first = await snapshotFundFlowToMongo();
  assert.equal(first.sinkSalesWritten, 1);

  // re-snapshot with nothing changed for this pair
  await snapshotFundFlowToMongo();
  const rewrote = await ValidatorSinkSale.countDocuments({ operator_address: `${P}E`, sink_address: `${P}sinkE` });
  assert.equal(rewrote, 1); // still just the one doc from `first`
});
