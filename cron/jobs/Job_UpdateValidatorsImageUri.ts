import Validator from "../../models/Validator/Validator.js";
import async from "async"; // Make sure async is imported
import { getKeybasePicture } from "../../models/Validator/functions/getKeybasePicture.js";

export const Job_UpdateValidatorsImageUri = (callback: (err: string | null, success: Boolean) => any) => {
  Validator.find({})
    .then((validators) => {
      async.timesSeries(
        validators.length,
        (i, next) => {
          console.log(i);
          const eachValidator = validators[i];

          if (!eachValidator.keybase_id) return next();

          getKeybasePicture(eachValidator.keybase_id, (err, imageUri) => {
            if (err) return next();

            eachValidator.temporary_image_uri = imageUri;
            eachValidator.save();
            next(); 
          });
        },
        (err) => {
          if (err) return callback('async_error', false);
        }
      );
    })
    .catch((err) => callback('async_error', false));
};
