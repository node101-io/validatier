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

// Resolve __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pug template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect('mongodb://127.0.0.1:27017/validator-timeline')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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

app.listen(PORT, () => {

  startCronJobs();

  console.log(`Server running at PORT ${PORT}`);
});

