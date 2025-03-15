
window.onload = () => {

  const currentDate = new Date();
  let currentYearValue = currentDate.getFullYear();
  let currentMonthValue = (currentDate.getMonth() + 1);

  handleNetworkSwitch(getCookie('network'));
  handleValidatorSearch();
  handleTooltipEvents();
  handleCalendarEvents(currentYearValue, currentMonthValue, document.getElementById('calendar-format-toggle').value)
  renderValidators();
  handleExportEvents();
}
