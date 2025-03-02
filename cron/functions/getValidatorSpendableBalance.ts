
import axios from 'axios';

import { convertOperationAddressToBech32 } from '../../utils/convertOperationAddressToBech32.js';
import { GeneralRewardObjectInterface } from './getValidatorUnclaimedRewardsAndComission.js'

interface ValidatorBalancesInterface {
  balances: [
    GeneralRewardObjectInterface: GeneralRewardObjectInterface
  ];
}

const REST_API_BASE_URL = 'https://rest.cosmos.directory/cosmoshub';
const REST_API_ENDPOINT = 'cosmos/bank/v1beta1/spendable_balances';

export const getValidatorSpendableBalance = function (operator_address: string, callback: (err: string | null, balanceArray: GeneralRewardObjectInterface[] | null) => any) {

  convertOperationAddressToBech32(operator_address, (err, validatorBech32Address) => {
    if (err) return callback('bad_request', null);
    axios.get(`${REST_API_BASE_URL}/${REST_API_ENDPOINT}/${validatorBech32Address}`)
      .then((response) => {

        const data: ValidatorBalancesInterface = response.data;
        callback(null, data.balances);  
      
      }).catch(err => callback(err, null))
  })
}
