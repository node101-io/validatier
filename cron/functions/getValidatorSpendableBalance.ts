
import axios from 'axios';

import { convertOperatorAddressToBech32 } from '../../utils/convertOperatorAddressToBech32.js';
import { GeneralRewardObjectInterface } from './getValidatorUnclaimedRewardsAndComission.js';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

const REST_API_BASE_URL = 'https://rest.cosmos.directory/cosmoshub';
const REST_API_ENDPOINT = 'cosmos/bank/v1beta1/spendable_balances';

export const getValidatorSpendableBalance = function (operator_address: string, callback: (err: string | null, balanceArray: GeneralRewardObjectInterface[] | null) => any) {

  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);

  const validatorBech32Address = convertOperatorAddressToBech32(operator_address, '');
  if (!validatorBech32Address) return callback('bad_request', null);
  axios
    .get(`${REST_API_BASE_URL}/${REST_API_ENDPOINT}/${validatorBech32Address}`)
    .then((response: { data: { balances: GeneralRewardObjectInterface[]} }) => callback(null, response.data.balances))
    .catch(err => callback('bad_request', null))
  
}
