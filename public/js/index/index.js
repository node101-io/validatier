
window.onload = () => {

  const currentDate = new Date();
  let currentYearValue = currentDate.getFullYear();
  let currentMonthValue = (currentDate.getMonth() + 1);
  
  // handleNetworkSwitch(getCookie('network'));
  initializeCache();
  handleValidatorSearch();
  handleCalendarEvents(currentYearValue, currentMonthValue, "monday" /* document.getElementById('calendar-format-toggle').value */)
  renderValidators();
  handleNavbar();
  handleExportEvents();
  handlePlotButtonClick();
  handleSummaryGraphActions();
}
