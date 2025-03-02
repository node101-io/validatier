
const GET_PERIODIC_DATA_API_ENDPOINT = 'composite_event_block/get_total_periodic_self_stake_and_withdraw';

window.onload = () => {

  /*
    cosmosvaloper103agss48504gkk3la5xcg5kxplaf6ttnuv234h
    24650515
  */

  changeInitialsFontFamily('Sofia');

  const BASE_URL = window.location.href;
  
  const totalSelfStakeResult = document.getElementById('query-total-self-stake-result-content');
  const totalWithdrawResult = document.getElementById('query-total-withdraw-result-content');
  const submitButton = document.getElementById('query-submit-button');
  const operatorAddress = document.getElementById('periodic-query-operator-address');
  const bottomBlockHeight = document.getElementById('periodic-query-bottom-block-height');
  const topBlockHeight = document.getElementById('periodic-query-top-block-height');
  const requestResultDisplayContent = document.getElementById('general-single-line-request-result-display-content');

  submitButton.addEventListener('click', (event) => {

    if (
      !operatorAddress.value || typeof operatorAddress.value != 'string' ||
      !bottomBlockHeight.value || typeof parseInt(bottomBlockHeight.value) != 'number' ||
      !topBlockHeight.value || typeof parseInt(topBlockHeight.value) != 'number' ||
      bottomBlockHeight.value >= topBlockHeight.value
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
        bottom_block_height: bottomBlockHeight.value,
        top_block_height: topBlockHeight.value,
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
