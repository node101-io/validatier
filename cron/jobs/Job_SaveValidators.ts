import async from 'async';

import Validator, { ValidatorInterface } from '../../models/Validator/Validator.js';
import { getActiveValidators, ValidatorResponse } from '../functions/getActiveValidators.js';

export const Job_SaveValidators = (callback: (err: string | null, success: Boolean) => any) => {

  const visitedValidatorsOperatorAddresses: string[] | null = [];

  getActiveValidators((err: string | null, validators: ValidatorResponse[] | null) => {

    if (err || !validators) return callback('validator_count_zero', false);

    async.timesSeries(
      validators.length, 
      (i, next) => {
        const eachValidator = validators[i];
        const validatorSaveObject = {
          pubkey: eachValidator.consensus_pubkey.key ? eachValidator.consensus_pubkey.key : 'N/A',
          operator_address: eachValidator.operator_address ? eachValidator.operator_address : 'N/A',
          moniker: eachValidator.description.moniker ? eachValidator.description.moniker : 'N/A',
          commission_rate: eachValidator.commission.commission_rates.rate ? eachValidator.commission.commission_rates.rate : 'N/A',
          bond_shares: eachValidator.validator_bond_shares ? eachValidator.validator_bond_shares : 'N/A',
          liquid_shares: eachValidator.liquid_shares ? eachValidator.liquid_shares : 'N/A',
        }

        Validator.saveValidator(validatorSaveObject, (err, newValidator) => {
          if (err) return callback(err, false);
          if (newValidator) {
            visitedValidatorsOperatorAddresses.push(newValidator.operator_address);
            next()
          };
        })
      }, 
      (err) => {
        if (err) return callback('async_error', false);

        if (!visitedValidatorsOperatorAddresses || visitedValidatorsOperatorAddresses.length < 0) return callback(null, true);

        Validator.deleteValidatorsNotAppearingOnApiResponse(
          { visitedValidatorsOperatorAddresses }, 
          (err, validators) => {
            if (err) return callback('async_error', false);
            return callback(null, true);
        })
      }
    )
  })
};