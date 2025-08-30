import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { Job_SaveCache } from '../cron/jobs/Job_SaveCache.js';

dotenv.config({ path: path.join(import.meta.dirname, '../../.env') });

if (!process.env.MONGO_URI) {
  console.log('MONGO_URI is not set');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

Job_SaveCache((err, success) => {
  if (err) return console.log(err);
  process.exit(0);
});
