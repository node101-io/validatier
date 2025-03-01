
import async from "async";

import RewardRecordEvent from "../../models/RewardRecord/RewardRecord.js";
import Validator, { ValidatorInterface } from "../../models/Validator/Validator.js";

import { changeDenomAmountObjectToTwoArrayFormat } from "../../utils/changeDenomAmountObjectToTwoArrayFormat.js";
import { getValidatorUnclaimedRewardsAndComission } from "../functions/getValidatorUnclaimedRewardsAndComission.js";

export const Job_RecordValidatorRewards = function (callback: (err: string | null, success: Boolean) => any) {

  Validator.find({}, (err: string, validators: ValidatorInterface[]) => {
    if (err) return callback(err, false);

    async.timesSeries(
      validators.length, 
      (i, next) => {
        const eachValidator = validators[i];

        getValidatorUnclaimedRewardsAndComission(eachValidator.operator_address, (err, validatorRewardsAndComissions) => {
          if (err || !validatorRewardsAndComissions) return callback("fetch_error", false);

          const saveRewardRecordEventObject = {
            operator_address: eachValidator.operator_address,
            rewardsDenomArray: [""],
            rewardsAmountArray: [""],
            comissionsDenomArray: [""],
            comissionsAmountArray: [""]
          }

          changeDenomAmountObjectToTwoArrayFormat(validatorRewardsAndComissions.self_bond_rewards, (err, responseSelfBondRewards) => {

            if (err || !responseSelfBondRewards?.denomsArray || !responseSelfBondRewards?.amountsArray) return callback("conversion_error", false);

            saveRewardRecordEventObject.rewardsDenomArray = responseSelfBondRewards.denomsArray;
            saveRewardRecordEventObject.rewardsAmountArray = responseSelfBondRewards.amountsArray;

            changeDenomAmountObjectToTwoArrayFormat(validatorRewardsAndComissions.commission, (err, responseComissions) => {
              if (err || !responseComissions?.denomsArray || !responseComissions?.amountsArray) return callback("conversion_error", false);
            

              saveRewardRecordEventObject.comissionsDenomArray = responseComissions.denomsArray;
              saveRewardRecordEventObject.comissionsAmountArray = responseComissions.amountsArray;

              RewardRecordEvent.saveRewardRecordEvent(saveRewardRecordEventObject, (err, newRewardsRecordEvent) => {
                if (err || !newRewardsRecordEvent) callback("save_error", false);
                next();
              })
            })
          })
        })      
      }, 
      (err) => {
        if (err) return callback("async_error", false);
        return callback(null, true);
      }
    )
  })
}

