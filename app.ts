import express, { Express } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import { Job_SaveNodes } from './cron/Job_SaveNodes.js';


import indexRouter from './routes/indexRouter.js';
import nodeRouter from './routes/nodeRouter.js';
import nodeDataLogRouter from './routes/nodeDataLogRouter.js';


dotenv.config();

const app: Express = express();
const PORT: number = 3000;

// Resolve __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pug template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const mongooseConnection = mongoose.connect('mongodb://127.0.0.1:27017/validator-timeline');


// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET as string, // Ensure this is defined in .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Favicon
app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// Routes
app.use('/', indexRouter);
app.use('/node', nodeRouter);
app.use('/nodeDataLog', nodeDataLogRouter);

import { getIpLookupData } from './cron/functions/getIpLookupData.js';

// Start server
app.listen(PORT, () => {

  // Job_SaveNodes();

  mongooseConnection.then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });


  const ipAddresses = [
    "172.67.207.44",
    "104.26.3.94",
    "13.35.78.113"
  ];

  // getIpLookupData(ipAddresses);

  console.log(`Server running at PORT ${PORT}`);
});

