import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { upsertSinkRegistryRow, loadSinkRegistryRows, lookupSink } from './sinkRegistry';

const P = 'testsink';
const cleanup = () =>
  getSqlite().prepare(`DELETE FROM sink_registry WHERE address LIKE '${P}%'`).run();

before(() => {
  openSqlite();
  cleanup();
});
after(() => {
  cleanup();
  closeSqlite();
});

test('lookupSink returns null for an unknown address', () => {
  assert.equal(lookupSink(`${P}unknown`), null);
});

test('upsert then lookup round-trips tier + kind', () => {
  upsertSinkRegistryRow({ address: `${P}cex1`, tier: 1, kind: 'cex' });
  assert.deepEqual(lookupSink(`${P}cex1`), { tier: 1, kind: 'cex' });
});

test('upsert replaces (kind can change on re-run)', () => {
  upsertSinkRegistryRow({ address: `${P}addr`, tier: 1, kind: 'cex' });
  upsertSinkRegistryRow({ address: `${P}addr`, tier: 2, kind: 'structural' });
  assert.deepEqual(lookupSink(`${P}addr`), { tier: 2, kind: 'structural' });
});

test('loadSinkRegistryRows bulk-loads a batch', () => {
  loadSinkRegistryRows([
    { address: `${P}a`, tier: 1, kind: 'cex' },
    { address: `${P}b`, tier: 1, kind: 'validator' },
  ]);
  assert.deepEqual(lookupSink(`${P}a`), { tier: 1, kind: 'cex' });
  assert.deepEqual(lookupSink(`${P}b`), { tier: 1, kind: 'validator' });
});
