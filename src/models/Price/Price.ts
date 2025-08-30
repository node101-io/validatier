import mongoose, { Document, Model, Schema } from 'mongoose';

export interface PriceInterface extends Document {
  timestamp: number;
  day: number;
  month: number;
  year: number;
  price: number;
}

export interface PriceModel extends Model<PriceInterface> {
  savePriceFunction: (
    body: {
      day: number,
      month: number,
      year: number,
      price: number
    },
    callback: (
      err: string | null,
      result: {
        day: number,
        month: number,
        year: number,
        price: number
      } | null
    ) => any
  ) => any;
  getMostRecentPriceDocument: (
    body: {},
    callback: (
      err: string | null,
      result: {
        day: number,
        month: number,
        year: number,
        timestamp: number,
        price: number
      } | null
    ) => any
  ) => any;
  getPriceGraphData: (
    body: {
      bottom_timestamp: number,
      top_timestamp: number,
    },
    callback: (
      err: string | null,
      priceGraphData: number[] | null
    ) => any
  ) => any
}

const PriceSchema: Schema<PriceInterface> = new Schema({
  timestamp: {
    type: Number,
    required: true
  },
  day: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
});

PriceSchema.statics.savePriceFunction = function (
  body: Parameters<PriceModel['savePriceFunction']>[0],
  callback: Parameters<PriceModel['savePriceFunction']>[1]
) {
  const { day, month, year, price } = body;
  const timestamp = (new Date(year, month - 1, day)).getTime();

  Price.updateOne(
    { day, month, year },
    {
      $set: {
        price,
        timestamp
      },
    },
    { upsert: true }
  )
    .then(result => callback(null, body))
    .catch(error => callback(error, null));
};

PriceSchema.statics.getMostRecentPriceDocument = function (
  body: Parameters<PriceModel['getMostRecentPriceDocument']>[0],
  callback: Parameters<PriceModel['getMostRecentPriceDocument']>[1]
) {
  Price.findOne().sort({ timestamp: -1 })
    .then(mostRecent => callback(null, mostRecent))
    .catch(err => callback(err, null));
}

PriceSchema.statics.getPriceGraphData = function (
  body: Parameters<PriceModel['getPriceGraphData']>[0],
  callback: Parameters<PriceModel['getPriceGraphData']>[1],
) {

  const { bottom_timestamp, top_timestamp } = body;

  const numberOfDataPoints = 90;
  const intervalMs = Math.ceil((top_timestamp - bottom_timestamp) / numberOfDataPoints);

  const groupId: Record<string, any> = {
    bucket: {
      $floor: {
        $divide: [{ $toLong: '$timestamp' }, intervalMs]
      }
    }
  };

  Price.aggregate([
    {
      $match: {
        timestamp: {
          $gte: bottom_timestamp,
          $lte: top_timestamp,
        },
      },
    },
    {
      $group: {
        _id: groupId,
        timestamp: { $first: '$timestamp' },
        price: { $avg: '$price' }
      }
    },
    {
      $sort: {
        timestamp: 1,
        price: 1
      }
    }
  ])
    .hint({ timestamp: 1, price: 1 })
    .then(result => callback(null, result.map(each => (Math.round(each.price * 100) / 100)) || null))
    .catch(err => callback(err, null))
}

const Price = mongoose.model<PriceInterface, PriceModel>('Price', PriceSchema);

export default Price;
