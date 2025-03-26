import cron from 'node-cron';

import { Job_RecordValidatorBalance } from './jobs/Job_RecordValidatorBalance.js';
import { Job_RecordValidatorRewards } from './jobs/Job_RecordValidatorRewards.js';
import { Job_SaveValidators } from './jobs/Job_SaveValidators.js';
import { Job_UpdateValidatorsImageUri } from './jobs/Job_UpdateValidatorsImageUri.js';
import { Job_SaveChains } from './jobs/Job_SaveChains.js';

const SEPERATOR_LINE = '---------------------------------------------------';
const TEST_TIME_INTERVAL_REGEX = '*/10 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';


export const startCronJobs = () => {

  console.log('Cron jobs started with the time interval regex of ' + TEST_TIME_INTERVAL_REGEX);

  cron.schedule(TEST_TIME_INTERVAL_REGEX, () => {
    console.log(SEPERATOR_LINE);
    Job_SaveChains((err, success) => {
      if (err && !success) return console.error(err + ' | ' + new Date())
      console.info('Cron Job: SaveChains | success | ' + new Date());
      Job_UpdateValidatorsImageUri((err, success) => {
        if (err && !success) return console.error(err + ' | ' + new Date())
        console.info('Cron Job UpdateValidatorsImageUri | success | ' + new Date());
        console.log(SEPERATOR_LINE);
      })
    });
  })
}
