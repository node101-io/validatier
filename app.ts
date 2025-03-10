import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';

import compositeEventBlockRouter from './routes/compositeEventBlockRouter.js';
import indexRouter from './routes/indexRouter.js';
import validatorRouter from './routes/validatorRouter.js';

import { startCronJobs } from './cron/startCronJobs.js';
import { listenEvents } from './listeners/listenForEvents.js';
import Chain from './models/Chain/Chain.js';

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
  .connect('mongodb://127.0.0.1:27017/validator-timeline')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
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
app.use('/composite_event_block', compositeEventBlockRouter);
app.use('/validator', validatorRouter);

import async from 'async';

app.listen(PORT, () => {
  console.log(`Server running at PORT ${PORT}`);

  const chains = ['agoric', 'cosmoshub', 'lava', 'celestia', 'evmos', 'osmosis'];
  async.timesSeries(
    chains.length, 
    (i, next) => {
      fetch(`https://chains.cosmos.directory/${chains[i]}`)
        .then(response => response.json())
        .then(data => {
          Chain.saveChain({
            name: data.chain.chain_name,
            pretty_name: data.chain.pretty_name,
            chain_id: data.chain.chain_id,
            image: data.chain.logo_URIs.png,
          }, (err, chain) => {
            return next();
          })
        })
    }, 
    () => {
      console.log('done')
    }
  )
});

