import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { fileURLToPath } from 'url';
import http from 'http';
import mongoose from 'mongoose';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { Server } from 'socket.io';

import compositeEventBlockRouter from './routes/compositeEventBlockRouter.js';
import indexRouter from './routes/indexRouter.js';
import validatorRouter from './routes/validatorRouter.js';

import { startCronJobs } from './cron/startCronJobs.js';
import { startFetchingData } from './utils/startFetchingData.js';
import { handleSocketIoConnection } from './controllers/Validator/getGraphData/get.js';

dotenv.config();

const app: Express = express();
const PORT: number = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(rateLimit({
  windowMs: 1000,
  max: 200,
  message: 'maximum_request_per_second_reached',
}));

mongoose
  .connect('mongodb://127.0.0.1:27017/validator-timeline-test-v3')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

app.use('/', indexRouter);
app.use('/composite_event_block', compositeEventBlockRouter);
app.use('/validator', validatorRouter);

import { decodeTxRaw, Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { getGenesisTxs } from './utils/getGenesisTxs.js';

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.listen(PORT + 1);

const registry = new Registry(defaultRegistryTypes);

app.listen(PORT, () => {
  handleSocketIoConnection(io)
  console.log(`Server running at PORT ${PORT}`);
  // startFetchingData();

  getGenesisTxs('cosmoshub', (err, string) => {
    console.log('cosmoshub is done');
  })
  getGenesisTxs('celestia', (err, string) => {
    console.log('celestia is done');
  })
})
