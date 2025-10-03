import async from 'async';
import Validator from '../../models/Validator/Validator.js';

export const Job_SyncValidatorInfo = (
  callback: (
    err: string | null,
    success: boolean
  ) => any
) => {
  Validator
    .find({})
    .then(validators => {
      async.timesSeries(
        validators.length,
        (i, next) => {
          const validator = validators[i];
          fetch(`https://rest.cosmos.directory/cosmoshub/cosmos/staking/v1beta1/validators/${validator.operator_address}`)
            .then(response => response.json())
            .then(data => {
              if (!data.validator || !data.validator.operator_address) return next();

              Validator.saveValidator({
                operator_address: data.validator.operator_address,
                chain_identifier: 'cosmoshub',
                moniker: data.validator.description.moniker,
                keybase_id: data.validator.description.identity,
                website: data.validator.description.webiste,
                security_contact: data.validator.description.security_contact,
                description: data.validator.description.details,
                commission_rate: data.validator.commission.commission_rates.rate
              }, (err, validator) => {
                return next()
              })
            })
        },
        (err: any) => {
          if (err)
            return callback(err.toString(), false);
          return callback(null, true);
        }
      )
    })
    .catch(err => callback(err, false))
}