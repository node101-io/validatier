import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { upsertSinkRegistryRow } from '../store/sinkRegistry';
import { classifyRecipient } from './classify';
import type { RealTransfer } from '../chain/blockResults';

const P = 'testclassify';

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
function transfer(recipient: string, opts: Partial<RealTransfer> = {}): RealTransfer {
  return {
    sender: `${P}sender`,
    recipient,
    amount: 1n,
    msg_index: 0,
    source: 'tx',
    tx_index: 0,
    withdraw_tag: null,
    is_ibc_out: false,
    ...opts,
  };
}

const cleanup = () => {
  const db = getSqlite();
  db.prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();
  db.prepare(`DELETE FROM sink_registry WHERE address LIKE '${P}%'`).run();
};

before(() => {
  openSqlite();
  cleanup();
});
after(() => {
  cleanup();
  closeSqlite();
});

test('IBC-out wins regardless of registry or in-degree', () => {
  insertEdge(`${P}A`, `${P}escrow`, 100n);
  classifyRecipient(transfer(`${P}escrow`, { is_ibc_out: true }));
  assert.deepEqual(statusOf(`${P}A`, `${P}escrow`), { status: 'realized', sink_kind: 'ibc_out' });
});

test('Tier 1 registry hit -> realized with the registered kind', () => {
  insertEdge(`${P}A`, `${P}binance`, 500n);
  upsertSinkRegistryRow({ address: `${P}binance`, tier: 1, kind: 'cex' });
  classifyRecipient(transfer(`${P}binance`));
  assert.deepEqual(statusOf(`${P}A`, `${P}binance`), { status: 'realized', sink_kind: 'cex' });
});

test('Tier 2 registry hit (previously discovered) stays suspected, not realized', () => {
  insertEdge(`${P}A`, `${P}discovered`, 500n);
  upsertSinkRegistryRow({ address: `${P}discovered`, tier: 2, kind: 'structural' });
  classifyRecipient(transfer(`${P}discovered`));
  assert.deepEqual(statusOf(`${P}A`, `${P}discovered`), {
    status: 'suspected',
    sink_kind: 'structural',
  });
});

test('below in-degree threshold and no registry entry: stays in_flight, untouched', () => {
  insertEdge(`${P}A`, `${P}plain`, 500n);
  classifyRecipient(transfer(`${P}plain`));
  assert.deepEqual(statusOf(`${P}A`, `${P}plain`), { status: 'in_flight', sink_kind: null });
});

test('in-degree at/above threshold (no registry entry) -> suspected/structural', () => {
  // config.tier2MinIndegree from .env.example is 5
  for (const letter of ['A', 'B', 'C', 'D', 'E']) {
    insertEdge(`${P}${letter}`, `${P}pool`, 10n);
  }
  classifyRecipient(transfer(`${P}pool`));
  for (const letter of ['A', 'B', 'C', 'D', 'E']) {
    assert.deepEqual(statusOf(`${P}${letter}`, `${P}pool`), {
      status: 'suspected',
      sink_kind: 'structural',
    });
  }
});

test('classification marks ALL origins present at the recipient, not just one', () => {
  insertEdge(`${P}X`, `${P}multi`, 10n);
  insertEdge(`${P}Y`, `${P}multi`, 20n);
  upsertSinkRegistryRow({ address: `${P}multi`, tier: 1, kind: 'dex' });
  classifyRecipient(transfer(`${P}multi`));
  assert.equal(statusOf(`${P}X`, `${P}multi`)!.status, 'realized');
  assert.equal(statusOf(`${P}Y`, `${P}multi`)!.status, 'realized');
});
