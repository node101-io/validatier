
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
  last_365_days: {
    bottom: number,
    top: number
  },
} {
  const currentDateObj = new Date();
  const currentDateTimestamp = currentDateObj.getTime();

  const dayMiliseconds = 1000 * 60 * 60 * 24;

  return {
    all_time: {
      bottom: allTimeBottomTimestamp,
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
    last_365_days: {
      bottom: currentDateTimestamp - (dayMiliseconds * 365),
      top: currentDateTimestamp
    },
  };
}
