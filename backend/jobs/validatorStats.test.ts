import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { config } from '../config';
import { ValidatorStats } from '../models/ValidatorStats/ValidatorStats';
import { buildValidatorStatsOps } from './validatorStats';

const P = 'cosmosvaloper1teststats';

const cleanup = () => ValidatorStats.deleteMany({ operator_address: P });

before(async () => {
  await mongoose.connect(config.mongoUri);
  await cleanup();
});

after(async () => {
  await cleanup();
  await mongoose.connection.close();
});

async function applyDay(input: Parameters<typeof buildValidatorStatsOps>[0]) {
  const { ensureOp, dayWriteOp } = buildValidatorStatsOps(input);
  await ValidatorStats.bulkWrite([ensureOp], { ordered: false });
  await ValidatorStats.bulkWrite([dayWriteOp], { ordered: false });
}

test('first write in a month creates one doc with a 31-length null array, populated only at day-1 index', async () => {
  await applyDay({
    operator_address: P,
    year: 2026,
    month: 3,
    day: 5,
    ts: 1000,
    height: 100,
    total_stake: 222n,
    reward: 10n,
    commission: 1n,
  });

  const docs = await ValidatorStats.find({ operator_address: P }).lean();
  assert.equal(docs.length, 1);
  const doc = docs[0];
  assert.equal(doc.year, 2026);
  assert.equal(doc.month, 3);
  assert.equal(doc.total_stake.length, 31);
  assert.equal(doc.total_stake[4], '222');
  assert.equal(doc.total_withdrawn_reward[4], '10');
  assert.equal(doc.total_withdrawn_commission[4], '1');
  assert.equal(doc.timestamp[4], 1000);
  assert.equal(doc.block_height[4], 100);
  // untouched slots stay null, not just index 0/1/2/3 but the rest of the month too
  assert.equal(doc.total_stake[0], null);
  assert.equal(doc.total_stake[30], null);
});

test('a second day in the same month reuses the same document (no path conflict) and does not disturb the first day', async () => {
  await applyDay({
    operator_address: P,
    year: 2026,
    month: 3,
    day: 6,
    ts: 2000,
    height: 200,
    total_stake: 444n,
    reward: 20n,
    commission: 2n,
  });

  const docs = await ValidatorStats.find({ operator_address: P, year: 2026, month: 3 }).lean();
  assert.equal(docs.length, 1); // ensure-op was a no-op the second time, not a second doc
  const doc = docs[0];
  assert.equal(doc.total_stake[4], '222'); // day 5 from the previous test untouched
  assert.equal(doc.total_stake[5], '444'); // day 6 -> index 5
  assert.equal(doc.total_withdrawn_reward[5], '20');
});

test('a different month for the same validator creates a separate document', async () => {
  await applyDay({
    operator_address: P,
    year: 2026,
    month: 4,
    day: 1,
    ts: 3000,
    height: 300,
    total_stake: 666n,
    reward: 30n,
    commission: 3n,
  });

  const docs = await ValidatorStats.find({ operator_address: P }).sort({ month: 1 }).lean();
  assert.equal(docs.length, 2);
  assert.equal(docs[0].month, 3);
  assert.equal(docs[1].month, 4);
  assert.equal(docs[1].total_stake[0], '666');
});
