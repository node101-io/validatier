import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { setDefault, applyOverride } from '../store/withdrawMap';
import { processSeedTransfer } from './seed';
import { MODULE_ACCOUNTS } from '../chain/moduleAccounts';
import type { RealTransfer, WithdrawTag } from '../chain/blockResults';

const P = 'testseed';
const CTX = { height: 100, ts: 1_784_200_000 };

function claim(
  recipient: string,
  amount: bigint,
  tag: WithdrawTag | null,
  sender: string = MODULE_ACCOUNTS.distribution
): RealTransfer {
  return { sender, recipient, amount, msg_index: 0, source: 'tx', tx_index: 0, withdraw_tag: tag };
}

function seedRow(origin: string) {
  return getSqlite().prepare('SELECT * FROM seed WHERE origin = ?').get(origin) as
    | { reward_withdrawn: bigint; commission_withdrawn: bigint }
    | undefined;
}
function edgeRow(origin: string, holder: string) {
  return getSqlite()
    .prepare('SELECT * FROM edges WHERE origin = ? AND holder = ?')
    .get(origin, holder) as
    | { weight: bigint; depth: bigint; status: string; weight_prefix_sum: bigint }
    | undefined;
}

const cleanup = () => {
  const db = getSqlite();
  db.prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();
  db.prepare(`DELETE FROM seed WHERE origin LIKE '${P}%'`).run();
  db.prepare(`DELETE FROM withdraw_map WHERE operator_address LIKE '${P}%'`).run();
};

before(() => {
  openSqlite();
  cleanup();
  setDefault(`${P}op1`, `${P}addr1`);
  // commingled: two operators withdrawing to one shared wallet
  setDefault(`${P}op2`, `${P}addr2`);
  setDefault(`${P}op3`, `${P}addr3`);
  applyOverride(`${P}op2`, `${P}shared`);
  applyOverride(`${P}op3`, `${P}shared`);
});
after(() => {
  cleanup();
  closeSqlite();
});

test('reward claim credits seed and opens a depth-1 in_flight edge', () => {
  const ok = processSeedTransfer(
    claim(`${P}addr1`, 500n, { kind: 'reward', validator: `${P}op1` }),
    CTX
  );
  assert.equal(ok, true);
  assert.equal(seedRow(`${P}op1`)!.reward_withdrawn, 500n);
  assert.equal(seedRow(`${P}op1`)!.commission_withdrawn, 0n);
  const e = edgeRow(`${P}op1`, `${P}addr1`)!;
  assert.equal(e.weight, 500n);
  assert.equal(e.depth, 1n);
  assert.equal(e.status, 'in_flight');
  assert.equal(e.weight_prefix_sum, 500n);

  // second claim accumulates (cumulative seed + edge weight)
  processSeedTransfer(claim(`${P}addr1`, 250n, { kind: 'reward', validator: `${P}op1` }), CTX);
  assert.equal(seedRow(`${P}op1`)!.reward_withdrawn, 750n);
  assert.equal(edgeRow(`${P}op1`, `${P}addr1`)!.weight, 750n);
});

test('commission claim credits the commission column', () => {
  processSeedTransfer(claim(`${P}addr1`, 99n, { kind: 'commission', validator: `${P}op1` }), CTX);
  const row = seedRow(`${P}op1`)!;
  assert.equal(row.commission_withdrawn, 99n);
  assert.equal(row.reward_withdrawn, 750n); // untouched
});

test('commingled wallet: claim credits exactly the named validator', () => {
  processSeedTransfer(claim(`${P}shared`, 100n, { kind: 'reward', validator: `${P}op2` }), CTX);
  assert.equal(seedRow(`${P}op2`)!.reward_withdrawn, 100n);
  assert.equal(seedRow(`${P}op3`), undefined); // op3 got NOTHING — no splitting
  assert.equal(edgeRow(`${P}op2`, `${P}shared`)!.weight, 100n);
  assert.equal(edgeRow(`${P}op3`, `${P}shared`), undefined);
});

test('claim earned as a delegator to an unrelated validator is NOT seed', () => {
  const ok = processSeedTransfer(
    claim(`${P}addr1`, 777n, { kind: 'reward', validator: `${P}unrelated_op` }),
    CTX
  );
  assert.equal(ok, false);
  assert.equal(seedRow(`${P}unrelated_op`), undefined);
  assert.equal(edgeRow(`${P}unrelated_op`, `${P}addr1`), undefined);
});

test('non-distribution sender / missing tag are not seed', () => {
  assert.equal(
    processSeedTransfer(
      claim(`${P}addr1`, 10n, { kind: 'reward', validator: `${P}op1` }, 'cosmos1randomwallet'),
      CTX
    ),
    false
  );
  assert.equal(processSeedTransfer(claim(`${P}addr1`, 10n, null), CTX), false);
});

test('no edge to the distribution module, ever', () => {
  const n = getSqlite()
    .prepare('SELECT COUNT(*) AS n FROM edges WHERE holder = ?')
    .get(MODULE_ACCOUNTS.distribution) as { n: bigint };
  assert.equal(n.n, 0n);
});
