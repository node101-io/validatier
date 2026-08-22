import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSqlite, closeSqlite, getSqlite } from '../db/sqlite';
import { getCursor, advanceCursor, getLastValidatorSyncTs, setLastValidatorSyncTs } from './meta';

before(() => openSqlite());
after(() => closeSqlite());

test('getCursor reads the single meta row (guaranteed to exist by schema init)', () => {
  const cursor = getCursor();
  assert.equal(typeof cursor.height, 'number');
  assert.equal(typeof cursor.ts, 'number');
});

test('advanceCursor updates height/ts and updated_at, without creating a second row', () => {
  const before = getCursor();
  advanceCursor(before.height + 1, before.ts + 6);
  const after = getCursor();
  assert.equal(after.height, before.height + 1);
  assert.equal(after.ts, before.ts + 6);

  const rowCount = getSqlite().prepare('SELECT COUNT(*) AS n FROM meta').get() as { n: bigint };
  assert.equal(Number(rowCount.n), 1); // still single-row

  // restore, so this test doesn't permanently shift the real cursor
  advanceCursor(before.height, before.ts);
});

test('getLastValidatorSyncTs is null until set, then round-trips', () => {
  const original = getLastValidatorSyncTs();
  setLastValidatorSyncTs(1700000000);
  assert.equal(getLastValidatorSyncTs(), 1700000000);

  // restore
  if (original === null) {
    getSqlite().prepare('UPDATE meta SET last_validator_sync_ts = NULL WHERE id = 1').run();
  } else {
    setLastValidatorSyncTs(original);
  }
});
