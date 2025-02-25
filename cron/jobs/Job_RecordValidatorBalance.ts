
import async from "async";
import Validator, { ValidatorInterface } from "../../models/Validator/Validator.js";
import BalanceRecordEvent from "../../models/BalanceRecord/BalanceRecord.js";
import { getValidatorSpendableBalance } from "../functions/getValidatorSpendableBalance.js";
import { changeDenomAmountObjectToTwoArrayFormat } from "../../utils/changeDenomAmountObjectToTwoArrayFormat.js";

export const Job_RecordValidatorBalance = function (callback: (err: string | null, success: Boolean) => any) {

  Validator.find({}, (err: string, validators: ValidatorInterface[]) => {
    if (err) return callback(err, false);

    async.timesSeries(validators.length, (i, next) => {
      const eachValidator = validators[i];

      getValidatorSpendableBalance(eachValidator.operation_address, (err, validatorBalances) => {
        if (err || !validatorBalances) return callback("fetch_error", false);
        changeDenomAmountObjectToTwoArrayFormat(validatorBalances, (err, response) => {

          if (err || !response?.denomsArray || !response?.amountsArray) return callback("conversion_error", false);

          BalanceRecordEvent.saveBalanceRecordEvent({
            operation_address: eachValidator.operation_address,
            denomArray: response.denomsArray,
            balanceArray: response.amountsArray
          }, (err, newBalanceRecordEvent) => {
            if (err || !newBalanceRecordEvent) return callback("save_error", false);
            next();
          })
        })
      })      
    }, (err) => {
      if (err) return callback("async_error", false);
      return callback(null, true);
    })
  })
}

