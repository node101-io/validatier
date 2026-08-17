import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { setDefault, applyOverride, operatorsFor, withdrawAddressOf } from './withdrawMap';

// Runs against the working store; rows are namespaced with a test prefix and
// cleaned up on both sides.
const P = 'testwmap';
const cleanup = () =>
  getSqlite()
    .prepare(`DELETE FROM withdraw_map WHERE operator_address LIKE '${P}%'`)
    .run();

before(() => {
  openSqlite();
  cleanup();
});
after(() => {
  cleanup();
  closeSqlite();
});

test('default mapping: operator <-> derived address, both directions', () => {
  setDefault(`${P}op1`, `${P}addr1`);
  assert.equal(withdrawAddressOf(`${P}op1`), `${P}addr1`);
  assert.deepEqual(operatorsFor(`${P}addr1`), [`${P}op1`]);
  // idempotent
  setDefault(`${P}op1`, `${P}addr1`);
  assert.deepEqual(operatorsFor(`${P}addr1`), [`${P}op1`]);
});

test('override replaces the old mapping (delete old row, insert new)', () => {
  setDefault(`${P}op2`, `${P}addr2`);
  applyOverride(`${P}op2`, `${P}treasury`);
  assert.equal(withdrawAddressOf(`${P}op2`), `${P}treasury`);
  assert.deepEqual(operatorsFor(`${P}addr2`), []); // old address released
});

test('commingled: one address maps to multiple operators (array)', () => {
  setDefault(`${P}op3`, `${P}addr3`);
  setDefault(`${P}op4`, `${P}addr4`);
  applyOverride(`${P}op3`, `${P}shared`);
  applyOverride(`${P}op4`, `${P}shared`);
  assert.deepEqual(operatorsFor(`${P}shared`).sort(), [`${P}op3`, `${P}op4`]);
  // each operator still resolves to the shared wallet
  assert.equal(withdrawAddressOf(`${P}op3`), `${P}shared`);
  assert.equal(withdrawAddressOf(`${P}op4`), `${P}shared`);
});
