import async from 'async';

import Validator from '../../models/Validator/Validator.js';
import { getActiveValidators, ValidatorResponse } from '../functions/getActiveValidators.js';

export const Job_SaveValidators = (callback: (err: string | null, success: Boolean) => any) => {

  getActiveValidators((validators: ValidatorResponse[]) => {

    if (!validators) return callback('validator_count_zero', false);

    async.timesSeries(
      validators.length, 
      (i, next) => {
        const eachValidator = validators[i];
        const validatorSaveObject = {
          pubkey: eachValidator.consensus_pubkey.key,
          operator_address: eachValidator.operator_address,
          moniker: eachValidator.description.moniker,
          commission_rate: eachValidator.commission.commission_rates.rate,
          bond_shares: eachValidator.validator_bond_shares,
          liquid_shares: eachValidator.liquid_shares,
        }

        Validator.saveValidator(validatorSaveObject, (err, newValidator) => {
          if (err) return callback(err, false);
          if (newValidator) next();
        })
      }, 
      (err) => {
        if (err) return callback('async_error', false);
        return callback(null, true);
      }
    )
  })
};