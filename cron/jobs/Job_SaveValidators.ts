import cron from 'node-cron';

import Validator from '../../models/Validator/Validator.js';
import { getActiveValidators, ValidatorResponse } from '../functions/getActiveValidators.js';
import async from "async";

export const Job_SaveValidators = (INTERVAL_TIME_REGEX_STRING: string, callback: (err: string, success: Boolean) => any) => {

  cron.schedule(INTERVAL_TIME_REGEX_STRING, async () => {
    getActiveValidators((validators: ValidatorResponse[]) => {

      if (!validators) return callback("validator_count_zero", false);

      async.timesSeries(validators.length, (i, next) => {
        const eachValidator = validators[i];

        const validatorSaveObject = {
          pubkey: eachValidator.consensus_pubkey.key,
          operator_address: eachValidator.operator_address,
          moniker: eachValidator.description.moniker,
          commission_rate: eachValidator.commission.commission_rates.rate,
          bond_shares: eachValidator.validator_bond_shares,
          liquid_shares: eachValidator.liquid_shares,
        }

        Validator.createNewValidator(validatorSaveObject, (err, newValidator) => {
          if (err) return callback(err, false);

          if (newValidator) next();
        })
      })
    })
  });
};