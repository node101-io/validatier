import type { Model, HydratedDocument } from 'mongoose';
import type { IMeta } from '../Meta';

// The one access path to the single meta document: creates it with schema
// defaults on first call, returns the same document ever after. The empty
// filter + upsert makes "at most one doc" hold no matter who calls first.
export async function getSingleton(this: Model<IMeta>): Promise<HydratedDocument<IMeta>> {
  return this.findOneAndUpdate(
    {},
    { $setOnInsert: {} },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}
