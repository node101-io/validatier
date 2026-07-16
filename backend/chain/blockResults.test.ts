import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBlockResults, type RealTransfer } from './blockResults';
import { MODULE_ACCOUNTS } from './moduleAccounts';

// Real cosmoshub blocks captured 2026-07-16 (finalize_block_events trimmed to a
// representative sample — transfers + accrual examples kept).
function fixture(height: number): unknown {
  const p = path.resolve(__dirname, '..', '..', 'chain', '__fixtures__', `block_${height}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

test('block 32055430: fee/tip and non-uatom skipped, only finalize transfers remain', () => {
  const transfers = parseBlockResults(fixture(32055430));

  // The tx contains: fee transfer (3690uatom, no msg_index), tip transfer
  // (2162uatom, no msg_index), and an IBC-denom transfer WITH msg_index.
  // All three must be dropped -> zero tx-source transfers.
  assert.equal(transfers.filter((t) => t.source === 'tx').length, 0);

  // Finalize: mint -> fee_collector and fee_collector -> distribution kept;
  // the consumer_rewards_pool transfer with EMPTY amount dropped.
  const fin = transfers.filter((t) => t.source === 'finalize');
  assert.equal(fin.length, 2);
  assert.deepEqual(
    fin.map((t) => [t.sender, t.recipient, t.amount]),
    [
      [MODULE_ACCOUNTS.mint, MODULE_ACCOUNTS.fee_collector, 11919594n],
      [MODULE_ACCOUNTS.fee_collector, MODULE_ACCOUNTS.distribution, 11919594n],
    ]
  );
  for (const t of fin) {
    assert.equal(t.msg_index, null);
    assert.equal(t.withdraw_tag, null);
  }
});

test('block 32055440: real sends kept, reward claim tagged, fees skipped', () => {
  const transfers = parseBlockResults(fixture(32055440));
  const tx = transfers.filter((t) => t.source === 'tx');

  // 3 txs, each with fee/tip transfers (no msg_index) that must vanish,
  // leaving exactly one real transfer per tx.
  assert.equal(tx.length, 3);

  // tx0: plain bank send to an exchange deposit address (MEXC, from defined_accounts.csv)
  assert.equal(tx[0].tx_index, 0);
  assert.equal(tx[0].amount, 669446693n);
  assert.equal(tx[0].msg_index, 0);
  assert.equal(tx[0].withdraw_tag, null);

  // tx1: reward claim — distribution module pays out, withdraw_rewards at the
  // same msg_index tags it with kind + the exact validator. Seed-inflow signal for 6.1.
  assert.equal(tx[1].tx_index, 1);
  assert.equal(tx[1].sender, MODULE_ACCOUNTS.distribution);
  assert.equal(tx[1].amount, 209n);
  assert.deepEqual(tx[1].withdraw_tag, {
    kind: 'reward',
    validator: 'cosmosvaloper1k6e7l0lz497l8njqjxpd3g4wlkdfwe93uqf03k',
  });

  // tx2: another plain send
  assert.equal(tx[2].tx_index, 2);
  assert.equal(tx[2].amount, 10048111420n);
  assert.equal(tx[2].withdraw_tag, null);

  assert.equal(transfers.filter((t) => t.source === 'finalize').length, 2);
});

// ── Synthetic edge cases (shapes match the real event structure) ──────────

function transferEvent(sender: string, recipient: string, amount: string, msgIndex?: string) {
  const attributes = [
    { key: 'recipient', value: recipient },
    { key: 'sender', value: sender },
    { key: 'amount', value: amount },
  ];
  if (msgIndex !== undefined) attributes.push({ key: 'msg_index', value: msgIndex });
  return { type: 'transfer', attributes };
}

test('multisend: multiple transfers under one msg_index -> one record per recipient', () => {
  const raw = {
    txs_results: [
      {
        code: 0,
        events: [
          transferEvent('cosmos1sender', 'cosmos1rcpt_a', '100uatom', '0'),
          transferEvent('cosmos1sender', 'cosmos1rcpt_b', '250uatom', '0'),
        ],
      },
    ],
  };
  const transfers = parseBlockResults(raw);
  assert.deepEqual(
    transfers.map((t: RealTransfer) => [t.recipient, t.amount, t.msg_index]),
    [
      ['cosmos1rcpt_a', 100n, 0],
      ['cosmos1rcpt_b', 250n, 0],
    ]
  );
});

test('failed tx (code != 0) contributes nothing', () => {
  const raw = {
    txs_results: [{ code: 5, events: [transferEvent('cosmos1a', 'cosmos1b', '100uatom', '0')] }],
  };
  assert.equal(parseBlockResults(raw).length, 0);
});

test('multi-coin amount: only the uatom component counts; zero uatom skipped', () => {
  const raw = {
    txs_results: [
      {
        code: 0,
        events: [
          transferEvent('cosmos1a', 'cosmos1b', '12ibc/ABC,7uatom', '0'),
          transferEvent('cosmos1a', 'cosmos1c', '0uatom', '1'),
          transferEvent('cosmos1a', 'cosmos1d', '', '2'),
        ],
      },
    ],
  };
  const transfers = parseBlockResults(raw);
  assert.equal(transfers.length, 1);
  assert.equal(transfers[0].amount, 7n);
});

test('withdraw_commission tags its msg_index; other msgs in the tx untouched', () => {
  const raw = {
    txs_results: [
      {
        code: 0,
        events: [
          { type: 'withdraw_commission', attributes: [{ key: 'amount', value: '55uatom' }, { key: 'validator', value: 'cosmosvaloper1xyz' }, { key: 'msg_index', value: '0' }] },
          transferEvent('cosmos1distr', 'cosmos1val', '55uatom', '0'),
          transferEvent('cosmos1val', 'cosmos1other', '10uatom', '1'),
        ],
      },
    ],
  };
  const transfers = parseBlockResults(raw);
  assert.deepEqual(transfers[0].withdraw_tag, { kind: 'commission', validator: 'cosmosvaloper1xyz' });
  assert.equal(transfers[1].withdraw_tag, null);
});

test('null txs_results / missing finalize events tolerated', () => {
  assert.deepEqual(parseBlockResults({ txs_results: null }), []);
  assert.deepEqual(parseBlockResults({}), []);
});
