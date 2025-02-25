
import { Job_SaveValidators } from './jobs/Job_SaveValidators.js';

interface IntervalRegexStringParamsInterface { 
  Job_SaveValidators: string;
  Job_SaveChangesAndDataLogs: string;
}

const DEVELOPMENT_FIVE_SECOND_REGEX_STRING = '*/5 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';


export const startCronJobs = () => {
  Job_SaveValidators(DEVELOPMENT_FIVE_SECOND_REGEX_STRING, (err, success) => {
    if (!err && success) console.info("Cron Job 1 Executed successfully | " + new Date());
  });
}
