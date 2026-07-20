import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { setDefault } from '../store/withdrawMap';
import { isTainted } from '../store/edges';
import { upsertSinkRegistryRow } from '../store/sinkRegistry';
import { processTransfer } from './pipeline';
import { MODULE_ACCOUNTS } from '../chain/moduleAccounts';
import type { RealTransfer, WithdrawTag } from '../chain/blockResults';

const P = 'testpipe';
const CTX = { height: 200, ts: 1_784_300_000 };

function transfer(
  sender: string,
  recipient: string,
  amount: bigint,
  tag: WithdrawTag | null = null
): RealTransfer {
  return { sender, recipient, amount, msg_index: 0, source: 'tx', tx_index: 0, withdraw_tag: tag, is_ibc_out: false };
}

const cleanup = () => {
  const db = getSqlite();
  db.prepare(`DELETE FROM edges WHERE origin LIKE '${P}%'`).run();
  db.prepare(`DELETE FROM seed WHERE origin LIKE '${P}%'`).run();
  db.prepare(`DELETE FROM withdraw_map WHERE operator_address LIKE '${P}%'`).run();
  db.prepare(`DELETE FROM sink_registry WHERE address LIKE '${P}%'`).run();
};

before(() => {
  openSqlite();
  cleanup();
  setDefault(`${P}op1`, `${P}waddr`);
});
after(() => {
  cleanup();
  closeSqlite();
});

test('taint check runs on the partial index (EXPLAIN QUERY PLAN)', () => {
  const plan = getSqlite()
    .prepare("EXPLAIN QUERY PLAN SELECT 1 FROM edges WHERE holder = ? AND status != 'realized' LIMIT 1")
    .all('anyaddr') as Array<{ detail: string }>;
  assert.ok(
    plan.some((r) => r.detail.includes('idx_edges_holder')),
    `expected idx_edges_holder in plan, got: ${plan.map((r) => r.detail).join(' | ')}`
  );
});

test('module transfers are excluded (restake, mint, fee_collector flows)', () => {
  // finalize-style protocol flow: mint -> fee_collector
  assert.equal(
    processTransfer(transfer(MODULE_ACCOUNTS.mint, MODULE_ACCOUNTS.fee_collector, 1000n), CTX),
    'excluded'
  );
  // restake: wallet -> bonded_tokens_pool (NOT a sale!)
  assert.equal(
    processTransfer(transfer(`${P}waddr`, MODULE_ACCOUNTS.bonded_tokens_pool, 500n), CTX),
    'excluded'
  );
  // gov deposit
  assert.equal(processTransfer(transfer(`${P}waddr`, MODULE_ACCOUNTS.gov, 500n), CTX), 'excluded');
});

test('foreign delegator claim from distribution falls through to exclusion', () => {
  const d = processTransfer(
    transfer(MODULE_ACCOUNTS.distribution, `${P}waddr`, 42n, {
      kind: 'reward',
      validator: `${P}not_the_owner`,
    }),
    CTX
  );
  assert.equal(d, 'excluded'); // seed guard rejected -> module rule swallowed it
  assert.equal(isTainted(`${P}waddr`), false); // and nothing was written
});

test('seed -> taint -> propagate lifecycle', () => {
  // before any seed: the wallet is not tainted, its sends are ignored
  assert.equal(isTainted(`${P}waddr`), false);
  assert.equal(processTransfer(transfer(`${P}waddr`, 'cosmos1somebody', 10n), CTX), 'untainted');

  // a real claim seeds it
  const d = processTransfer(
    transfer(MODULE_ACCOUNTS.distribution, `${P}waddr`, 800n, {
      kind: 'reward',
      validator: `${P}op1`,
    }),
    CTX
  );
  assert.equal(d, 'seeded');
  assert.equal(isTainted(`${P}waddr`), true);

  // now its outgoing transfer must be followed (contraction = 6.3)
  assert.equal(processTransfer(transfer(`${P}waddr`, 'cosmos1somebody', 10n), CTX), 'propagate');
});

test('withdrawing DIRECTLY to a known sink is realized immediately (the Kraken case)', () => {
  // 2 real validators withdraw straight to Kraken with no intermediate hop —
  // classify must run on the SEED path too, or this edge would sit at
  // in_flight forever (confirmed fix, deviates from docs/01's literal "continue").
  upsertSinkRegistryRow({ address: `${P}kraken`, tier: 1, kind: 'cex' });
  setDefault(`${P}op_direct`, `${P}kraken`);

  const d = processTransfer(
    transfer(MODULE_ACCOUNTS.distribution, `${P}kraken`, 999n, {
      kind: 'reward',
      validator: `${P}op_direct`,
    }),
    CTX
  );
  assert.equal(d, 'seeded');

  const row = getSqlite()
    .prepare('SELECT status, sink_kind FROM edges WHERE origin = ? AND holder = ?')
    .get(`${P}op_direct`, `${P}kraken`) as { status: string; sink_kind: string };
  assert.deepEqual(row, { status: 'realized', sink_kind: 'cex' });

  // realized -> no longer tainted (terminal, matches the partial-index rule)
  assert.equal(isTainted(`${P}kraken`), false);
});

test('realized edges do not count as taint; suspected edges do', () => {
  const db = getSqlite();
  const ins = db.prepare(`
    INSERT INTO edges (origin, holder, weight, depth, status, sink_kind, weight_prefix_sum,
                       first_height, first_ts, last_height, last_ts)
    VALUES (?, ?, ?, 2, ?, NULL, ?, 1, 1, 1, 1)`);
  ins.run(`${P}op1`, `${P}cexaddr`, 100n, 'realized', 100n);
  assert.equal(isTainted(`${P}cexaddr`), false); // terminal sink — invisible to taint

  ins.run(`${P}op1`, `${P}structaddr`, 100n, 'suspected', 100n);
  assert.equal(isTainted(`${P}structaddr`), true); // suspected keeps being followed
});
