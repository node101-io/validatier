function getDateRange(currentDate) {
  const currentDateObj = new Date(currentDate);
  const currentYear = currentDateObj.getFullYear();
  const currentMonth = currentDateObj.getMonth();
  const currentDay = currentDateObj.getDate();

  const formatDate = (date) => date.toISOString().split("T")[0];

  const allTimeBottomTimestamp = document
    .getElementById("network-switch-header")
    .getAttribute("current_chain_first_available_time");

  return {
    all_time: {
      bottom: formatDate(new Date(allTimeBottomTimestamp)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1)),
    },
    last_90_days: {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 90)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1)),
    },
    last_180_days: {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 180)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1)),
    },
    last_365_days: {
      bottom: formatDate(new Date(currentYear, currentMonth, currentDay - 365)),
      top: formatDate(new Date(currentYear, currentMonth, currentDay - 1)),
    },
  };
}
