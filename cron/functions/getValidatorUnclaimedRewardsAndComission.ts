
import axios from 'axios';
import { isOperatorAddressValid } from '../../utils/validationFunctions.js';

export interface GeneralRewardObjectInterface {
  denom: string;
  amount: string;
}

interface ValidatorUnclaimedRewardsAndComissionsInterface {
  operator_address: string;
  self_bond_rewards: [
    rewardObject: GeneralRewardObjectInterface
  ];
  commission: [
    comissionObject: GeneralRewardObjectInterface
  ];
}

const REST_API_BASE_URL = 'https://rest.cosmos.directory/cosmoshub';
const REST_API_ENDPOINT = 'cosmos/distribution/v1beta1/validators';

export const getValidatorUnclaimedRewardsAndComission = function (operator_address: string, callback: (err: string | null, ValidatorUnclaimedRewardsAndComissions: ValidatorUnclaimedRewardsAndComissionsInterface | null) => any) {
  
  if (!isOperatorAddressValid(operator_address)) return callback('format_error', null);
  
  axios
    .get(`${REST_API_BASE_URL}/${REST_API_ENDPOINT}/${operator_address}`)
    .then((response: { data: ValidatorUnclaimedRewardsAndComissionsInterface } ) => callback(null, response.data))
    .catch((err) => callback(err, null))
}
