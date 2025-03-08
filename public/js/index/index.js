
window.onload = () => {

  const currentDate = new Date();
  let currentYearValue = currentDate.getFullYear();
  let currentMonthValue = (currentDate.getMonth() + 1);

  handleNetworkSwitch(localStorage.getItem('selected-network-chain-id'));
  handleValidatorSearch();
  handleTooltipEvents();
  handleCalendarEvents(currentYearValue, currentMonthValue);
  renderValidators();
  handleExportEvents(
    'export-sort-by', 
    'export-order',
    'periodic-query-bottom-timestamp', 
    'periodic-query-top-timestamp'
  );
}
