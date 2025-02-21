

import { Tendermint34Client, Validator, ValidatorsParams, ValidatorsResponse, pubkeyToAddress } from '@cosmjs/tendermint-rpc';
import { ed25519PubKeyToHex } from '../../utils/addressConversion.js';
import async from 'async';


const rpcEndpoint: string = 'https://cosmos-rpc.publicnode.com';
      
const client: Tendermint34Client = await Tendermint34Client.connect(rpcEndpoint);

export const fetchValidators = async function (): Promise<ValidatorsResponse | null> {
  try {
      const validatorsMasterRawResponse: ValidatorsResponse = await client.validatorsAll();
      return validatorsMasterRawResponse;
  } catch (error) {
      console.log(`${new Date()} | Error: ${error}`);
      return null;
  }
}

export const getValidatorVotingPower = async function (pubkey: string, callback: (err: string | null, votingPower: string) => any)  {
  
  try {
    const validatorsMasterRawResponse: ValidatorsResponse = await client.validatorsAll();

    async.timesSeries(validatorsMasterRawResponse.validators.length, (i, next) => {
      const eachValidator: Validator = validatorsMasterRawResponse.validators[i];
      if (eachValidator.pubkey && ed25519PubKeyToHex(eachValidator.pubkey?.data) == pubkey) return callback(null, eachValidator.votingPower.toString());
      next();
    }, (err) => {
      return callback('not_found', 'N/A');
    })
  } catch (error) {
    return callback('could_not_get_voting_power', 'N/A');
  }
}
