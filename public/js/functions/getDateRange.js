
const FIRST_AVAILABLE_BLOCK_DATE = '2019-12-11T16:11:34Z';

function getDateRange(currentDate) {
  const currentDateObj = new Date(currentDate);
  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth();
  const currentDay = currentDateObj.getDate();
  const currentDayOfWeek = currentDateObj.getDay();

  const formatDate = (date) => date.toISOString().split('T')[0];

  const allTimeBottomTimestamp = document.getElementById('network-switch-header').getAttribute('current_chain_first_available_time');

  return {
    'all-time': {
      bottom: formatDate(new Date(allTimeBottomTimestamp)),
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
