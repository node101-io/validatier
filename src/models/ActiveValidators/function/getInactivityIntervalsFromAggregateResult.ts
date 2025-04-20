type Validator = {
  day: number;
  isActive: boolean;
};

type Result = {
  year: number;
  month: number;
  active_validators: Validator[];
};

export function getInactivityIntervals(results: Result[]) {

  let isValidatorActive = true;
  const inactivityIntervals: number[] = [];

  for (let i = 0; i < results.length; i++) {
    const eachMonth = results[i];
    
    for (let j = 0; j < eachMonth.active_validators.length; j++) {
      const eachDay = eachMonth.active_validators[j];
      if (eachDay.isActive == isValidatorActive) continue;
      isValidatorActive = !isValidatorActive;
      inactivityIntervals.push(
        new Date(eachMonth.year, eachMonth.month - 1, eachDay.day).getTime()
      );
    }
  }
  return inactivityIntervals;
}
