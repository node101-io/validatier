
window.onload = () => {

  const currentDate = new Date();
  let currentYearValue = currentDate.getFullYear();
  let currentMonthValue = (currentDate.getMonth() + 1);

  let isSelectingRange = false;
  let rangeInitialColumn;
  let rangeFinalColumn;
  let isSelectionDirectionToLeft = false;

  handleNetworkSwitch(getCookie('network'));
  handleValidatorSearch();
  handleCalendarEvents(currentYearValue, currentMonthValue, document.getElementById('calendar-format-toggle').value)
  renderValidators();
  handleExportEvents();
  handleCurrencyToggle(); 
  handlePlotButtonClick();
}
