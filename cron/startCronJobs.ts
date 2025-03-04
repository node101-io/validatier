import cron from 'node-cron';

import { Job_RecordValidatorBalance } from './jobs/Job_RecordValidatorBalance.js';
import { Job_RecordValidatorRewards } from './jobs/Job_RecordValidatorRewards.js';
import { Job_SaveValidators } from './jobs/Job_SaveValidators.js';
import { Job_UpdateValidatorsImageUri } from './jobs/Job_UpdateValidatorsImageUri.js';

const SEPERATOR_LINE = '---------------------------------------------------';
const TEST_TIME_INTERVAL_REGEX = '*/5 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';


export const startCronJobs = () => {

  console.log('👔 Cron jobs started with the time interval regex of ' + EVERY_HOUR_REGEX_STRING);

  // cron.schedule(EVERY_HOUR_REGEX_STRING, () => {
    console.log(SEPERATOR_LINE);
    Job_SaveValidators((err, success) => {
      if (err && !success) return console.error(err + ' | ' + new Date())
      console.info('Cron Job: SaveValidators | success | ' + new Date());
      Job_RecordValidatorBalance((err, success) => {
        if (err && !success) return console.error(err + ' | ' + new Date())
        console.info('Cron Job: RecordValidatorBalance| success | ' + new Date());
        Job_RecordValidatorRewards((err, success) => {
          if (err && !success) return console.error(err + ' | ' + new Date())
          console.info('Cron Job: RecordValidatorRewards | success | ' + new Date());
          Job_UpdateValidatorsImageUri((err, success) => {
            if (err && !success) return console.error(err + ' | ' + new Date())
            console.info('Cron Job UpdateValidatorsImageUri | success | ' + new Date());
            console.log(SEPERATOR_LINE);
          })          
        });
      });
    });
  // })
}
