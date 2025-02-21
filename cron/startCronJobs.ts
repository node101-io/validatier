
import { Job_SaveNodes } from "./jobs/Job_SaveNodes.js";
import { Job_SaveChangesAndDataLogs } from "./jobs/Job_SaveChangesAndDataLogs.js";

interface IntervalRegexStringParamsInterface { 
  Job_SaveNodes: string;
  Job_SaveChangesAndDataLogs: string;
}

const DEVELOPMENT_FIVE_SECOND_REGEX_STRING = '*/5 * * * * *';
const EVERY_HOUR_REGEX_STRING = '0 * * * *';


export const startCronJobs = () => {
  Job_SaveNodes(DEVELOPMENT_FIVE_SECOND_REGEX_STRING);
  Job_SaveChangesAndDataLogs(EVERY_HOUR_REGEX_STRING);
}
