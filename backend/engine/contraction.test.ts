import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { config } from '../config';
import { applyContraction, splitProRata } from './contraction';

const P = 'testcontr';
const CTX = { height: 300, ts: 1_784_400_000 };

function insertEdge(origin: string, holder: string, weight: bigint, depth: number, status = 'in_flight') {
  getSqlite()
    .prepare(
      `INSERT INTO edges (origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
                          first_height, first_ts, last_height, last_ts)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 1, 1, 1, 1)`
    )
    .run(origin, holder, weight, depth, status, weight);
}
function edge(origin: string, holder: string) {
  return getSqlite()
    .prepare('SELECT weight, depth, status FROM edges WHERE origin = ? AND holder = ?')
    .get(origin, holder) as { weight: bigint; depth: bigint; status: string } | undefined;
}
// weight-conservation: Σ weight over all of an origin's edges
function totalOf(origin: string): bigint {
  const r = getSqlite()
    .prepare('SELECT COALESCE(SUM(weight), 0) AS s FROM edges WHERE origin = ?')
    .get(origin) as { s: bigint };
  return r.s;
}
const cleanup = () => getSqlite().prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();

before(() => {
  openSqlite();
});
beforeEach(cleanup);
after(() => {
  cleanup();
  closeSqlite();
});

test('single origin: partial move re-anchors to the recipient', () => {
  insertEdge(`${P}A`, `${P}w1`, 1000n, 1);
  const res = applyContraction(`${P}w1`, `${P}w2`, 300n, CTX);
  assert.deepEqual(res, { moved: 300n, origins: 1 });
  assert.equal(edge(`${P}A`, `${P}w1`)!.weight, 700n);
  const to = edge(`${P}A`, `${P}w2`)!;
  assert.equal(to.weight, 300n);
  assert.equal(to.depth, 2n); // sender depth 1 + 1
  assert.equal(totalOf(`${P}A`), 1000n); // conservation
});

test('docs example: A=100, B=50, wallet sends 30 -> A pays 20, B pays 10', () => {
  insertEdge(`${P}A`, `${P}x`, 100n, 1);
  insertEdge(`${P}B`, `${P}x`, 50n, 3);
  applyContraction(`${P}x`, `${P}y`, 30n, CTX);
  assert.equal(edge(`${P}A`, `${P}x`)!.weight, 80n);
  assert.equal(edge(`${P}B`, `${P}x`)!.weight, 40n);
  assert.equal(edge(`${P}A`, `${P}y`)!.weight, 20n);
  assert.equal(edge(`${P}B`, `${P}y`)!.weight, 10n);
  // per-origin depths: from A's edge (1) -> 2; from B's edge (3) -> 4
  assert.equal(edge(`${P}A`, `${P}y`)!.depth, 2n);
  assert.equal(edge(`${P}B`, `${P}y`)!.depth, 4n);
  assert.equal(totalOf(`${P}A`), 100n);
  assert.equal(totalOf(`${P}B`), 50n);
});

test('rounding dust is ignored: floor pays move, leftovers stay on the sender', () => {
  insertEdge(`${P}A`, `${P}x`, 100n, 1);
  insertEdge(`${P}B`, `${P}x`, 50n, 1);
  const res = applyContraction(`${P}x`, `${P}y`, 31n, CTX); // floors: 20 + 10
  assert.equal(res.moved, 30n); // 1 uatom dust NOT moved
  assert.equal(edge(`${P}A`, `${P}y`)!.weight, 20n);
  assert.equal(edge(`${P}B`, `${P}y`)!.weight, 10n);
  assert.equal(edge(`${P}A`, `${P}x`)!.weight, 80n); // dust stays here
  assert.equal(edge(`${P}B`, `${P}x`)!.weight, 40n);
  // conservation still exact — dust never leaves the graph
  assert.equal(totalOf(`${P}A`) + totalOf(`${P}B`), 150n);
});

test('equal shares with dust: everyone pays the floor, nobody goes negative', () => {
  // w=[3,3,3], send 8: floor pays 2+2+2 -> moved 6, 2 uatom dust ignored.
  insertEdge(`${P}a`, `${P}x`, 3n, 1);
  insertEdge(`${P}b`, `${P}x`, 3n, 1);
  insertEdge(`${P}c`, `${P}x`, 3n, 1);
  const res = applyContraction(`${P}x`, `${P}y`, 8n, CTX);
  assert.equal(res.moved, 6n);
  for (const o of ['a', 'b', 'c']) {
    assert.equal(edge(`${P}${o}`, `${P}x`)!.weight, 1n); // 3 - 2
    assert.equal(edge(`${P}${o}`, `${P}y`)!.weight, 2n);
    assert.equal(totalOf(`${P}${o}`), 3n); // conserved
  }
});

test('overdraw: wallet sends more than its tracked money -> cap at total', () => {
  insertEdge(`${P}A`, `${P}x`, 100n, 1);
  insertEdge(`${P}B`, `${P}x`, 50n, 1);
  const res = applyContraction(`${P}x`, `${P}y`, 200n, CTX); // 50 untracked uatom involved
  assert.equal(res.moved, 150n); // only the tracked part
  assert.equal(edge(`${P}A`, `${P}x`), undefined); // fully drained + deleted
  assert.equal(edge(`${P}B`, `${P}x`), undefined);
  assert.equal(edge(`${P}A`, `${P}y`)!.weight, 100n);
  assert.equal(edge(`${P}B`, `${P}y`)!.weight, 50n);
});

test('receiver depth takes MIN(existing, sender+1)', () => {
  insertEdge(`${P}A`, `${P}x`, 100n, 4);
  insertEdge(`${P}A`, `${P}y`, 10n, 2); // receiver already known at depth 2
  applyContraction(`${P}x`, `${P}y`, 50n, CTX); // would arrive at depth 5
  assert.equal(edge(`${P}A`, `${P}y`)!.depth, 2n); // shorter path wins
  assert.equal(edge(`${P}A`, `${P}y`)!.weight, 60n);
});

test('realized edges at the sender do not participate in the haircut', () => {
  insertEdge(`${P}A`, `${P}x`, 100n, 1);
  insertEdge(`${P}B`, `${P}x`, 900n, 1, 'realized'); // terminal — not spendable taint
  applyContraction(`${P}x`, `${P}y`, 50n, CTX);
  assert.equal(edge(`${P}A`, `${P}y`)!.weight, 50n); // A pays everything
  assert.equal(edge(`${P}B`, `${P}y`), undefined);
  assert.equal(edge(`${P}B`, `${P}x`)!.weight, 900n); // untouched
});

test('self-transfer changes nothing', () => {
  insertEdge(`${P}A`, `${P}x`, 100n, 1);
  const res = applyContraction(`${P}x`, `${P}x`, 40n, CTX);
  assert.deepEqual(res, { moved: 0n, origins: 0 });
  assert.equal(edge(`${P}A`, `${P}x`)!.weight, 100n);
});

// ── Termination: MAX_DEPTH (docs/01 step 6) ─────────────────────────────

test('an edge already AT max depth is frozen: excluded from the next haircut', () => {
  const maxed = config.maxDepth; // e.g. 8 — this edge already hit the cap
  insertEdge(`${P}A`, `${P}x`, 100n, maxed);
  const res = applyContraction(`${P}x`, `${P}y`, 40n, CTX);
  assert.deepEqual(res, { moved: 0n, origins: 0 }); // nothing to move — only origin was frozen
  assert.equal(edge(`${P}A`, `${P}x`)!.weight, 100n); // untouched, still parked
  assert.equal(edge(`${P}A`, `${P}y`), undefined); // never reached the recipient
});

test('one origin frozen at max depth, another still active: only the active one moves', () => {
  const maxed = config.maxDepth;
  insertEdge(`${P}A`, `${P}x`, 100n, maxed); // frozen
  insertEdge(`${P}B`, `${P}x`, 50n, 2); // active
  const res = applyContraction(`${P}x`, `${P}y`, 30n, CTX);
  assert.deepEqual(res, { moved: 30n, origins: 1 }); // only B counted
  assert.equal(edge(`${P}A`, `${P}x`)!.weight, 100n); // A untouched
  assert.equal(edge(`${P}A`, `${P}y`), undefined); // A never propagated
  assert.equal(edge(`${P}B`, `${P}x`)!.weight, 20n); // B paid its full share (only holder)
  assert.equal(edge(`${P}B`, `${P}y`)!.weight, 30n);
});

test('reaching exactly max depth is allowed; only propagating FROM it is blocked', () => {
  const maxed = config.maxDepth;
  insertEdge(`${P}A`, `${P}x`, 100n, maxed - 1); // one hop away from the cap
  applyContraction(`${P}x`, `${P}y`, 40n, CTX);
  const arrived = edge(`${P}A`, `${P}y`)!;
  assert.equal(arrived.depth, BigInt(maxed)); // landed exactly at the cap — that's fine
  assert.equal(arrived.weight, 40n);

  // now try to move it further — this edge is AT the cap, must freeze
  const res2 = applyContraction(`${P}y`, `${P}z`, 40n, CTX);
  assert.deepEqual(res2, { moved: 0n, origins: 0 });
  assert.equal(edge(`${P}A`, `${P}y`)!.weight, 40n); // stayed parked
});

test('splitProRata is deterministic; Σ pay never exceeds effective', () => {
  const holders = [
    { origin: 'z', weight: 7n },
    { origin: 'a', weight: 7n },
    { origin: 'm', weight: 86n },
  ];
  const p1 = splitProRata(holders, 17n);
  const p2 = splitProRata([...holders].reverse(), 17n); // input order must not matter
  assert.deepEqual(Object.fromEntries(p1), Object.fromEntries(p2));
  // floors: 7*17/100=1, 1, 86*17/100=14 -> 16 moved, 1 uatom dust ignored
  const sum = [...p1.values()].reduce((x, y) => x + y, 0n);
  assert.equal(sum, 16n);
  assert.ok(sum <= 17n);
});
