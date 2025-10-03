import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import path from 'path';

import { startFetchingData } from './utils/startFetchingData.js';
import { initDB } from './utils/levelDb.js';
import { startCronJobs } from './cron/startCronJobs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/validator-timeline-test-v7';

await mongoose
  .connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

initDB((err) => {
  if (err) return console.log(err);
  console.log('Connected to LevelDB');
})

// testDataFetch();

if (process.env.NODE_ENV !== 'development') {
  startFetchingData();
  startCronJobs();
}
