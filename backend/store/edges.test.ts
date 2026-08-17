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
  markHolderStatus(`${P}sink`, 'realized', 'cex');
  assert.deepEqual(statusOf(`${P}A`, `${P}sink`), { status: 'realized', sink_kind: 'cex' });
  assert.deepEqual(statusOf(`${P}B`, `${P}sink`), { status: 'realized', sink_kind: 'cex' });
});

test('markHolderStatus never demotes an already-realized edge', () => {
  insertEdge(`${P}A`, `${P}fixed`, 100n, 'realized');
  // a later, weaker suspected signal must not overwrite the terminal sink
  markHolderStatus(`${P}fixed`, 'suspected', 'structural');
  assert.deepEqual(statusOf(`${P}A`, `${P}fixed`), { status: 'realized', sink_kind: null });
});
