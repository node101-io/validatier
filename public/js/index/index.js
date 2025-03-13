
window.onload = () => {

  const currentDate = new Date();
  let currentYearValue = currentDate.getFullYear();
  let currentMonthValue = (currentDate.getMonth() + 1);

  animateOverflowMonikers();
  handleNetworkSwitch(getCookie('network'));
  handleValidatorSearch();
  handleTooltipEvents();
  handleCalendarEvents(currentYearValue, currentMonthValue)
  renderValidators();
  handleExportEvents();
}
