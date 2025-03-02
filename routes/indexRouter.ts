import express, { Router } from 'express';
import indexGetController from '../controllers/index/index/get.js';

const router: Router = express.Router();

router.get(
  '/', 
  indexGetController
);

export default router;
