import { Request, Response } from 'express'
import Validator from '../../../models/Validator/Validator.js'

export default (req: Request, res: Response) => {
  Validator.getValidatorsByCustomFilter({}, (err, validators) => {
    if (err) return res.json({ err: err, success: false });
    return res.json({ success: true, data: validators  });
  })
}
