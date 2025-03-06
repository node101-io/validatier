
const GET_PERIODIC_DATA_API_ENDPOINT = 'composite_event_block/get_total_periodic_self_stake_and_withdraw';

window.onload = () => {

  const currentDate = new Date();
  let currentYearValue = currentDate.getFullYear();
  let currentMonthValue = (currentDate.getMonth() + 1);

  handleCalendarEvents(currentYearValue, currentMonthValue);

  renderValidators();
  // changeInitialsFontFamily('Sofia');

  const BASE_URL = window.location.href;
  
  const searchBy = document.getElementById('query-search-by');
  const totalSelfStakeResult = document.getElementById('query-total-self-stake-result-content');
  const totalWithdrawResult = document.getElementById('query-total-withdraw-result-content');
  const submitButton = document.getElementById('query-submit-button');
  const operatorAddress = document.getElementById('periodic-query-operator-address');
  const bottomBlockHeight = document.getElementById('periodic-query-bottom-block-height');
  const topBlockHeight = document.getElementById('periodic-query-top-block-height');
  const bottomTimestamp = document.getElementById('periodic-query-bottom-timestamp');
  const topTimestamp = document.getElementById('periodic-query-top-timestamp');
  const requestResultDisplayContent = document.getElementById('general-single-line-request-result-display-content');

  submitButton.addEventListener('click', (event) => {

    if (
      !searchBy.value || (searchBy.value != 'block_height' && searchBy.value != 'timestamp') ||
      !operatorAddress.value || typeof operatorAddress.value != 'string' ||
      (searchBy.value == 'block_height' && (!bottomBlockHeight.value || !topBlockHeight.value)) ||
      (searchBy.value == 'timestamp' && (!bottomTimestamp.value || !topTimestamp.value))
    ) {
      requestResultDisplayContent.style.color = 'goldenrod';
      return requestResultDisplayContent.innerHTML = 'Warning! Please provide input in the correct format.';
    };


    const timestampBeforeRequest = Date.now();

    serverRequest(
      BASE_URL + GET_PERIODIC_DATA_API_ENDPOINT,
      'POST',
      {
        operator_address: operatorAddress.value,
        bottom_block_height: bottomBlockHeight ? bottomBlockHeight.value : -1,
        top_block_height: topBlockHeight ? topBlockHeight.value : -1,
        bottom_timestamp: bottomTimestamp ? (new Date(bottomTimestamp.value)).getTime() : -1,
        top_timestamp: topTimestamp ? (new Date(topTimestamp.value)).getTime() : -1,
        search_by: searchBy.value
      },
      (response) => {

        if (!response.success || response.err) {
          console.log(response)
          requestResultDisplayContent.style.color = 'lightcoral';
          return requestResultDisplayContent.innerHTML = 'Error! ' + response.err;
        }

        const data = response.data;
        
        requestResultDisplayContent.style.color = 'lightgreen';
        requestResultDisplayContent.innerHTML = 'Success! Response time: ' + Math.abs((Date.now() - timestampBeforeRequest) / 1000) + 's';

        totalSelfStakeResult.innerHTML = uatomToAtom(data.self_stake);
        totalWithdrawResult.innerHTML = uatomToAtom(data.withdraw);
      }
    )
  })
}
