
export function getDateRange(allTimeBottomTimestamp: number): {
  all_time: {
    bottom: number,
    top: number
  },
  last_90_days: {
    bottom: number,
    top: number
  },
  last_180_days: {
    bottom: number,
    top: number
  },
  this_year: {
    bottom: number,
    top: number
  },
  last_calendar_year: {
    bottom: number,
    top: number
  }
} {
  const currentDateObj = new Date();
  const currentDateTimestamp = currentDateObj.getTime();

  const dayMiliseconds = 1000 * 60 * 60 * 24;

  return {
    all_time: {
      bottom: allTimeBottomTimestamp - (dayMiliseconds * 7),
      top: currentDateTimestamp
    },
    last_90_days: {
      bottom: currentDateTimestamp - (dayMiliseconds * 90),
      top: currentDateTimestamp
    },
    last_180_days: {
      bottom: currentDateTimestamp - (dayMiliseconds * 180),
      top: currentDateTimestamp
    },
    this_year: {
      bottom: (new Date(currentDateObj.getFullYear(), 0, 1)).getTime(),
      top: currentDateTimestamp
    },
    last_calendar_year: {
      bottom: (new Date(currentDateObj.getFullYear() - 1, 0, 1)).getTime(),
      top: (new Date(currentDateObj.getFullYear() - 1, 11, 31)).getTime()
    }
  };
}
