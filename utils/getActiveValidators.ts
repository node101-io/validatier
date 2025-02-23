

const REST_API_BASE_URL = 'https://rest.cosmos.directory/cosmoshub';
const REST_API_ENDPOINT = 'cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=570';

interface GetActiveValidatorsInterface {
  validators: any[]
}

export const getActiveValidators = (callback: (validators: any[]) => any) => {
  fetch(`${REST_API_BASE_URL}/${REST_API_ENDPOINT}`)
    .then(response => response.json())
    .then((response: GetActiveValidatorsInterface) => {
      return callback(response.validators);
    })
}
