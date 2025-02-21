import express, { Express } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import { startCronJobs } from './cron/startCronJobs.js';

import indexRouter from './routes/indexRouter.js';
import nodeRouter from './routes/nodeRouter.js';
import nodeDataLogRouter from './routes/nodeDataLogRouter.js';


dotenv.config();

const app: Express = express();
const PORT: number = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect('mongodb://127.0.0.1:27017/validator-timeline')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);


app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

app.use('/', indexRouter);
app.use('/node', nodeRouter);
app.use('/nodeDataLog', nodeDataLogRouter);

import { Tendermint34Client, Validator, ValidatorsParams, ValidatorsResponse, pubkeyToAddress } from '@cosmjs/tendermint-rpc';
import async from 'async';

app.listen(PORT, async () => {

  // startCronJobs();

  const rpcEndpoint: string = 'https://cosmos-rpc.publicnode.com';
      
  const client: Tendermint34Client = await Tendermint34Client.connect(rpcEndpoint);
  try {
    const validatorsMasterRawResponse = await client.validatorsAll();
    async.timesSeries(validatorsMasterRawResponse.validators.length, (i, next) => {
      if (!validatorsMasterRawResponse.validators[i].pubkey) return ('node_pubkey_not_found');

      console.log(pubkeyToAddress(validatorsMasterRawResponse.validators[i].pubkey?.algorithm, validatorsMasterRawResponse.validators[i].pubkey?.data))
      next();
    })
  } catch (error) {
      console.log(`${new Date()} | Error: ${error}`);
      return null;
  }

  console.log(`Server running at PORT ${PORT}`);
});

