import express, { Router } from 'express';
import indexGetController from '../controllers/index/index/get.js';

const router: Router = express.Router();

router.get(
  ['/', '/dashboard', '/validators', '/reward_flow', '/percentage_sold_graph', '/self_staked_and_delegation'], 
  indexGetController
);

export default router;
