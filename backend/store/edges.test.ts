import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { inDegreeOf, markHolderStatus } from './edges';

const P = 'testedges';

function insertEdge(origin: string, holder: string, weight: bigint, status = 'in_flight') {
  getSqlite()
    .prepare(
      `INSERT INTO edges (origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
                          first_height, first_ts, last_height, last_ts)
       VALUES (?, ?, ?, 1, ?, NULL, ?, 1, 1, 1, 1)`
    )
    .run(origin, holder, weight, status, weight);
}
function statusOf(origin: string, holder: string) {
  return getSqlite()
    .prepare('SELECT status, sink_kind FROM edges WHERE origin = ? AND holder = ?')
    .get(origin, holder) as { status: string; sink_kind: string | null } | undefined;
}
function rowOf(origin: string, holder: string) {
  return getSqlite()
    .prepare('SELECT status, sink_kind, last_height, last_ts FROM edges WHERE origin = ? AND holder = ?')
    .get(origin, holder) as
    | { status: string; sink_kind: string | null; last_height: bigint; last_ts: bigint }
    | undefined;
}
const cleanup = () => getSqlite().prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();

before(() => {
  openSqlite();
  cleanup();
});
after(() => {
  cleanup();
  closeSqlite();
});

test('inDegreeOf counts distinct origins at a holder, including realized ones', () => {
  insertEdge(`${P}A`, `${P}pool`, 100n);
  insertEdge(`${P}B`, `${P}pool`, 50n);
  insertEdge(`${P}C`, `${P}pool`, 25n, 'realized');
  assert.equal(inDegreeOf(`${P}pool`), 3);
  assert.equal(inDegreeOf(`${P}lonely_addr_never_seen`), 0);
});

test('markHolderStatus flips ALL non-realized edges at a holder', () => {
  insertEdge(`${P}A`, `${P}sink`, 100n);
  insertEdge(`${P}B`, `${P}sink`, 50n);
  markHolderStatus(`${P}sink`, 'realized', 'cex', 999, 9999);
  assert.deepEqual(statusOf(`${P}A`, `${P}sink`), { status: 'realized', sink_kind: 'cex' });
  assert.deepEqual(statusOf(`${P}B`, `${P}sink`), { status: 'realized', sink_kind: 'cex' });
});

test('markHolderStatus never demotes an already-realized edge', () => {
  insertEdge(`${P}A`, `${P}fixed`, 100n, 'realized');
  // a later, weaker suspected signal must not overwrite the terminal sink
  markHolderStatus(`${P}fixed`, 'suspected', 'structural', 999, 9999);
  assert.deepEqual(statusOf(`${P}A`, `${P}fixed`), { status: 'realized', sink_kind: null });
});

// Regression coverage for a real bug found 2026-09-23: a single
// markHolderStatus call flips EVERY non-realized origin at a holder, but
// before this fix only the origin whose transfer triggered contraction got
// its last_height bumped (by contraction.ts, for that hop) — every OTHER
// commingled origin's edge changed status with a STALE last_height, which a
// delta-based Mongo snapshot (jobs/snapshot.ts) filtering on
// "last_height > previous cursor" would then silently miss entirely.
test('markHolderStatus bumps last_height/last_ts on every edge it flips, even ones untouched by this hop', () => {
  insertEdge(`${P}A`, `${P}pool`, 100n); // last_height=1 from insertEdge's fixture values
  insertEdge(`${P}B`, `${P}pool`, 50n); // same — neither touched by "this hop"
  markHolderStatus(`${P}pool`, 'suspected', 'structural', 500, 5000);
  const a = rowOf(`${P}A`, `${P}pool`)!;
  const b = rowOf(`${P}B`, `${P}pool`)!;
  assert.equal(Number(a.last_height), 500);
  assert.equal(Number(a.last_ts), 5000);
  assert.equal(Number(b.last_height), 500);
  assert.equal(Number(b.last_ts), 5000);
});
