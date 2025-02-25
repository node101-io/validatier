
import { Job_RecordValidatorBalance } from './jobs/Job_RecordValidatorBalance.js';
import { Job_RecordValidatorRewards } from './jobs/Job_RecordValidatorRewards.js';
import { Job_SaveValidators } from './jobs/Job_SaveValidators.js';

import cron from 'node-cron';

const SEPERATOR_LINE = "---------------------------------------------------";
const TEST_TIME_INTERVAL_REGEX = '*/5 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';


export const startCronJobs = () => {

  cron.schedule(TEST_TIME_INTERVAL_REGEX, () => {
    console.log(SEPERATOR_LINE);
    Job_SaveValidators((err, success) => {
      if (err && !success) return console.error(err + " | " + new Date())
      console.info("Cron Job 1 executed successfully | " + new Date());
      Job_RecordValidatorBalance((err, success) => {
        if (err && !success) return console.error(err + " | " + new Date())
        console.info("Cron Job 2 executed successfully | " + new Date());
        Job_RecordValidatorRewards((err, success) => {
          if (err && !success) return console.error(err + " | " + new Date())
          console.info("Cron Job 3 executed successfully | " + new Date());
          console.log(SEPERATOR_LINE);
        });
      });
    });
  })
}
