import cron from 'node-cron';

import { Job_UpdateValidatorsImageUri } from './jobs/Job_UpdateValidatorsImageUri.js';
import { Job_SaveChains } from './jobs/Job_SaveChains.js';
import { Job_SyncPrices } from './jobs/Job_SyncPrices.js';
import { Job_SyncValidatorInfo } from './jobs/Job_SyncValidatorInfo.js';
import { Job_SaveCache } from './jobs/Job_SaveCache.js';

const SEPERATOR_LINE = '---------------------------------------------------';
const TEST_TIME_INTERVAL_REGEX = '*/10 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';
const EVERY_DAY_REGEX_STRING = '45 23 * * *';

export const startCronJobs = () => {
  console.log('Cron jobs started with the time interval regex of ' + EVERY_DAY_REGEX_STRING);

  cron.schedule(EVERY_DAY_REGEX_STRING, () => {
    console.log(SEPERATOR_LINE);
    Job_SaveChains((err, success) => {
      if (err && !success) return console.error('Cron Job: SaveChains | ' + err + ' | ' + new Date())
      console.info('Cron Job SaveChains | success | ' + new Date());

      Job_SyncPrices((err, success) => {
        if (err && !success) return console.error('Cron Job: SyncPrices | ' + err + ' | ' + new Date())
        console.info('Cron Job: SyncPrices | success | ' + new Date());

        Job_UpdateValidatorsImageUri((err, success) => {
          if (err && !success) return console.error('Cron Job: UpdateValidatorsImageUri | ' + err + ' | ' + new Date())
          console.info('Cron Job UpdateValidatorsImageUri | success | ' + new Date());

          Job_SyncValidatorInfo((err, success) => {
            if (err && !success) return console.error('Cron Job: SyncValidatorInfo | ' + err + ' | ' + new Date())
            console.info('Cron Job SyncValidatorInfo | success | ' + new Date());

            Job_SaveCache((err, success) => {
              if (err && !success) return console.error('Cron Job: SaveCache | ' + err + ' | ' + new Date())
              console.info('Cron Job SaveCache | success | ' + new Date());
            })
          })
        })
      })
    });
  })
}
