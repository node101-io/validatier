import async from 'async';
import { describe, it, assert, expect, beforeAll, afterAll } from 'vitest';
import CompositeEventBlock from '../models/CompositeEventBlock/CompositeEventBlock.js';
import mongoose from 'mongoose';

const DEMO_VALIDATOR_OPERATOR_ADDRESS = 'cosmosvaloper103agss48504gkk3la5xcg5kxplaf6ttnuv234h';

const COMPOSITE_EVENT_BLOCK_PERIODIC_BLOCK_HEIGHT_QUERIES_AND_RESULTS = [
  [[1, 10], [0, 0]],
  [[900000000000, 990000000000], [0, 0]],
  [[24650495, 900000000000], [0, 2596475]],
  [[0, 24650115], [22700000, 24272952]],
  [[24650415, 24650520], [2000000, 4834483]],
  [[0, 900000000000], [48020000, 37420088]]
];

const COMPOSITE_EVENT_BLOCK_PERIODIC_TIMESTAMP_QUERIES_AND_RESULTS = [
  [[1740787200000, 1740873600000], [0, 0]],
  [[1740787200000, 1741132800000], [48020000, 37420088]]
];

describe('Validator Timeline Test', () => {

  beforeAll(() => {
    mongoose
      .connect('mongodb://127.0.0.1:27017/validator-timeline')
      .then(() => console.log('Connected to MongoDB'))
      .catch(err => console.error('MongoDB connection error:', err));
  })

  describe('CompositeEventBlock', () => {

    it('should query periodic self_stake and withdraw by block_height', async () => {
      for (let i = 0; i < COMPOSITE_EVENT_BLOCK_PERIODIC_BLOCK_HEIGHT_QUERIES_AND_RESULTS.length; i++) {
        const eachTestCase = COMPOSITE_EVENT_BLOCK_PERIODIC_BLOCK_HEIGHT_QUERIES_AND_RESULTS[i];
    
        try {
          const totalPeriodicSelfStakeAndWithdraw: { self_stake: number, withdraw: number } | null  = await new Promise((resolve, reject) => {
            CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw({
              operator_address: DEMO_VALIDATOR_OPERATOR_ADDRESS,
              bottomBlockHeight: eachTestCase[0][0],
              topBlockHeight: eachTestCase[0][1],
              searchBy: 'block_height',
            }, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
    
          expect(totalPeriodicSelfStakeAndWithdraw).toBeTruthy();
          expect(totalPeriodicSelfStakeAndWithdraw?.self_stake).toBe(eachTestCase[1][0]);
          expect(totalPeriodicSelfStakeAndWithdraw?.withdraw).toBe(eachTestCase[1][1]);
        } catch (error) {
          console.error('Error:', error);
        }
      }
    });
    

    it('should query periodic self_stake and withdraw by timestamp', async () => {
      for (let i = 0; i < COMPOSITE_EVENT_BLOCK_PERIODIC_TIMESTAMP_QUERIES_AND_RESULTS.length; i++) {
        const eachTestCase = COMPOSITE_EVENT_BLOCK_PERIODIC_TIMESTAMP_QUERIES_AND_RESULTS[i];
    
        try {
          const totalPeriodicSelfStakeAndWithdraw: { self_stake: number, withdraw: number } | null  = await new Promise((resolve, reject) => {
            CompositeEventBlock.getTotalPeriodicSelfStakeAndWithdraw({
              operator_address: DEMO_VALIDATOR_OPERATOR_ADDRESS,
              bottomTimestamp: eachTestCase[0][0],
              topTimestamp: eachTestCase[0][1],
              searchBy: 'timestamp',
            }, (err, result) => {
              if (err) return reject(err);
              resolve(result);
            });
          });
    
          expect(totalPeriodicSelfStakeAndWithdraw).toBeTruthy();
          expect(totalPeriodicSelfStakeAndWithdraw?.self_stake).toBe(eachTestCase[1][0]);
          expect(totalPeriodicSelfStakeAndWithdraw?.withdraw).toBe(eachTestCase[1][1]);
        } catch (error) {
          console.error('Error:', error);
        }
      }
    });
  })
});
