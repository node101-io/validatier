import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import path from 'path';
// import { rateLimit } from 'express-rate-limit';

import indexRouter from './routes/indexRouter.js';
import validatorRouter from './routes/validatorRouter.js';
import { startFetchingData } from './utils/startFetchingData.js';
import { Job_UpdateValidatorsImageUri } from './cron/jobs/Job_UpdateValidatorsImageUri.js';
import { initDB } from './utils/levelDb.js';
import { Job_SaveChains } from './cron/jobs/Job_SaveChains.js';
import { getGenesisTxs } from './utils/getGenesisTxs.js';
import { startCronJobs } from './cron/startCronJobs.js';
import { Job_SaveCacheSummaryGraphs } from './cron/jobs/Job_SaveCacheSummaryGraphs.js';
import CompositeEventBlock from './models/CompositeEventBlock/CompositeEventBlock.js';

const app: Express = express();
const PORT: number = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '../views'));
app.use(cors());

dotenv.config({ path: path.join(__dirname, '../.env') });

// app.use(rateLimit({
//   windowMs: 1000,
//   max: 200,
//   message: 'maximum_request_per_second_reached',
// }));

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/validator-timeline-test-v7';

mongoose
  .connect(mongoUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

initDB((err) => {
    if (err) return console.log(err);
    console.log('Connected to LevelDB');
  })

app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

app.use('/', indexRouter);
app.use('/validator', validatorRouter);

app.listen(PORT, () => console.log(`Server running at PORT ${PORT}`));