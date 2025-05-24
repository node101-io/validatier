
function getDateRange(currentDate) {
  const currentDateObj = new Date(currentDate);
  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth();
  const currentDay = currentDateObj.getDate();
  const currentDayOfWeek = currentDateObj.getDay();

  const formatDate = (date) => date.toISOString().split('T')[0];

  const allTimeBottomTimestamp = document.getElementById('network-switch-header').getAttribute('current_chain_first_available_time');

  return {
    all_time: {
      bottom: formatDate(new Date(allTimeBottomTimestamp)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    last_90_days: {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 90)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    last_180_days: {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 180)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1))
    },
    this_year: {
      bottom: formatDate(new Date(currentYear, 0, 1)),
      top: formatDate(new Date(currentYear, 11, 31))
    },
    last_calendar_year: {
      bottom: formatDate(new Date(currentYear - 1, 0, 1)),
      top: formatDate(new Date(currentYear - 1, 11, 31))
    }
  };
}
