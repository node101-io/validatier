
import axios from 'axios';

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

export const getValidatorUnclaimedRewardsAndComission = function (operation_id: string, callback: (err: string | null, ValidatorUnclaimedRewardsAndComissions: ValidatorUnclaimedRewardsAndComissionsInterface | null) => any) {
  axios.get(`${REST_API_BASE_URL}/${REST_API_ENDPOINT}/${operation_id}`)
    .then((response) => {
    
      callback(null, response.data);
    
    }).catch((err) => callback(err, null))
}
