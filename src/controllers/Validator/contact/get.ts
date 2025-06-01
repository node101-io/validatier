import { Request, Response } from "express";
import Contact from "../../../models/Contact/Contact.js"

export default (req: Request, res: Response): any => {
  const { email_address } = req.query;
  if (
    !email_address ||
    typeof email_address != 'string'
  ) {
    return res.json({ success: false, err: 'bad_request' });
  }

  Contact.saveContact({ email_address }, (err, newContact) => {
    if (err) return res.json({ success: false, err: 'bad_request' });
    return res.json({ success: true, data: newContact });
  })
}