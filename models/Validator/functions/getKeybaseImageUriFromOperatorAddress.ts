
import axios from 'axios';
import { getKeybasePicture } from './getKeybasePicture.js';

const REST_API_BASE_URL = 'https://rest.cosmos.directory/cosmoshub/';
const REST_API_ENDPOINT = 'cosmos/staking/v1beta1/validators/';

export const getKeybaseImageUriFromOperatorAddress = function (operator_address: string, callback: (err: string | null, imageUri: string | null) => any) {
  
  axios.get(REST_API_BASE_URL + REST_API_ENDPOINT + operator_address)
    .then((res) => {
      getKeybasePicture(res.data.validator.description.identity, (err, imageUri) => {
        callback(null, imageUri)
      })
    })
}