import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import path from 'path';
import session from 'express-session';

import indexRouter from './routes/indexRouter.js';
import nodeRouter from './routes/nodeRouter.js';
import nodeDataLogRouter from './routes/nodeDataLogRouter.js';
import { startCronJobs } from './cron/startCronJobs.js';
import { listenEvents } from './utils/listenForEvents.js';


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

app.listen(PORT, () => {

  startCronJobs();
  listenEvents();

  console.log(`Server running at PORT ${PORT}`);
});

