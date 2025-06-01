
import mongoose, { Schema, Model } from 'mongoose';

export interface ContactInterface {
  email_address: string;
}

interface ContactModel extends Model<ContactInterface> {
  saveContact: (
    body: {  
      email_address: string
    }, 
    callback: (
      err: string | null,
      newContact: ContactInterface | null
    ) => any
  ) => any;
}

const contactSchema = new Schema<ContactInterface>({
  email_address: {
    type: String,
    required: true
  }
});

contactSchema.statics.saveContact = function (
  body: Parameters<ContactModel['saveContact']>[0],
  callback: Parameters<ContactModel['saveContact']>[1],
) {
  const { email_address } = body;

  Contact.findOneAndUpdate(
    { email_address },
    { $set: { email_address } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    },
  )
    .then((doc: ContactInterface | null) => callback(null, doc))
    .catch((err: any) => callback(err, null));
}

const Contact = mongoose.model<ContactInterface, ContactModel>('contacts', contactSchema);

export default Contact;
