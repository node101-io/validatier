
function getImageUriFromOperatorAddress (operator_address) {
  return `https://serve.dev-mintscan.com/assets/moniker/cosmos/64/${operator_address}.png`;
}

function renderValidators() {
  
  const GET_VALIDATORS_API_ENDPOINT = 'validator/get_validators';
  const BASE_URL = window.location.href;
  
  const validatorsMainWrapper = document.getElementById('validators-main-wrapper');

  serverRequest(
    BASE_URL + GET_VALIDATORS_API_ENDPOINT,
    'GET',
    {},
    (response) => {
      if (response.err || !response.success) return alert('could not fetch validators');
      const data = response.data;      

      for (let i = 0; i < data.length; i++) {
        const eachValidator = data[i];
        
        const eachValidatorWrapper = document.createElement('div');
        eachValidatorWrapper.classList.add('each-validator-wrapper')

        const validatorImageWrapper = document.createElement('div');
        validatorImageWrapper.classList.add('validator-image')
        const validatorImageContent = document.createElement('img');
        validatorImageContent.src = getImageUriFromOperatorAddress(eachValidator.operator_address);

        validatorImageWrapper.appendChild(validatorImageContent);

        const validatorMonikerWrapper = document.createElement('div');
        validatorMonikerWrapper.classList.add('validator-moniker');
        validatorMonikerWrapper.innerHTML = eachValidator.moniker;

        eachValidatorWrapper.appendChild(validatorImageWrapper);
        eachValidatorWrapper.appendChild(validatorMonikerWrapper);

        validatorsMainWrapper.appendChild(eachValidatorWrapper);
      }
    }
  )
}
