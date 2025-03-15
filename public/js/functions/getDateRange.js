function getDateRange(currentDate) {
  const currentDateObj = new Date(currentDate);
  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth();
  const currentDay = currentDateObj.getDate();
  const currentDayOfWeek = currentDateObj.getDay();

  const formatDate = (date) => date.toISOString().split('T')[0];

  return {
    'all-time': {
      bottom: formatDate(new Date(currentYear - 10, 0, 1)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    'last-week': {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - currentDayOfWeek - 7)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - currentDayOfWeek - 1))
    },
    'last-7-days': {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 7)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    'last-30-days': {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 30)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    'last-90-days': {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 90)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    'last-365-days': {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 365)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    'this-year': {
      bottom: formatDate(new Date(currentYear, 0, 1)),
      top: formatDate(new Date(currentYear, 11, 31))
    },
    'last-calendar-year': {
      bottom: formatDate(new Date(currentYear - 1, 0, 1)),
      top: formatDate(new Date(currentYear - 1, 11, 31))
    }
  };
}
