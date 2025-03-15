import async from 'async';

import Validator from '../../models/Validator/Validator.js';
import { getActiveValidators, ValidatorResponse } from '../functions/getActiveValidators.js';

export const Job_SaveValidators = (chainIdentifier: string, callback: (err: string | null, success: Boolean) => any) => {

  const visitedValidatorsOperatorAddresses: string[] | null = [];

  getActiveValidators(chainIdentifier, (err: string | null, validators: ValidatorResponse[] | null) => {

    if (err || !validators) return callback('validator_count_zero', false);

    async.timesSeries(
      validators.length, 
      (i, next) => {
        const eachValidator = validators[i];
        const validatorSaveObject = {
          chain_identifier: chainIdentifier,
          pubkey: eachValidator.consensus_pubkey.key ? eachValidator.consensus_pubkey.key : 'N/A',
          operator_address: eachValidator.operator_address ? eachValidator.operator_address : 'N/A',
          moniker: eachValidator.description.moniker ? eachValidator.description.moniker : 'N/A',
          commission_rate: eachValidator.commission.commission_rates.rate ? eachValidator.commission.commission_rates.rate : 'N/A',
          bond_shares: eachValidator.validator_bond_shares ? eachValidator.validator_bond_shares : 'N/A',
          liquid_shares: eachValidator.liquid_shares ? eachValidator.liquid_shares : 'N/A',
          keybase_id: eachValidator.description.identity.trim().length > 0 ? eachValidator.description.identity : 'N/A'
        }
        
        Validator.saveValidator(validatorSaveObject, (err, newValidator) => {
          if (err) return callback(err, false);
          if (newValidator) visitedValidatorsOperatorAddresses.push(newValidator.operator_address);
          return next();
        })
      }, 
      (err) => {
        if (err) return callback('async_error', false);

        if (!visitedValidatorsOperatorAddresses || visitedValidatorsOperatorAddresses.length < 0) return callback(null, true);

        Validator.deleteValidatorsNotAppearingOnApiResponse(
          { visitedValidatorsOperatorAddresses, chain_identifier: chainIdentifier }, 
          (err, validators) => {
            if (err) return callback('async_error', false);
            return callback(null, true);
        })
      }
    )
  })
};