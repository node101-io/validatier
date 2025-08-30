import express, { Router } from 'express';
import chainGetController from '../controllers/Chain/get.js';

const router: Router = express.Router();

router.get(
  '/info',
  chainGetController
);

export default router;
