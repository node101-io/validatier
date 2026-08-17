import { Schema, model } from 'mongoose';

// Schema mirrors docs/03-mongo-schema.md `prices` exactly — daily ATOM/USD history.
export interface IPrice {
  timestamp: number; // unix sec
  day: number;
  month: number;
  year: number;
  price: number; // ATOM/USD rate (a rate, not base units -> Number is fine)
}

const priceSchema = new Schema<IPrice>(
  {
    timestamp: { type: Number, required: true, index: true },
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { versionKey: false }
);

export const Price = model<IPrice>('Price', priceSchema, 'prices');
