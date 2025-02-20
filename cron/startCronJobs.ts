
import { Job_SaveNodes } from "./jobs/Job_SaveNodes.js";
import { Job_SaveChangesAndDataLogs } from "./jobs/Job_SaveChangesAndDataLogs.js";

interface IntervalRegexStringParamsInterface { 
  Job_SaveNodes: string;
  Job_SaveChangesAndDataLogs: string;
}

export const startCronJobs = (intervalRegexStringParams: IntervalRegexStringParamsInterface) => {
  Job_SaveNodes(intervalRegexStringParams.Job_SaveNodes);
  Job_SaveChangesAndDataLogs(intervalRegexStringParams.Job_SaveChangesAndDataLogs);
}
