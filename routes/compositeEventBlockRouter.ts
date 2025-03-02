
import express, { Router } from 'express';


import getTotalPeriodicSelfStakeAndWithdrawPostController from '../controllers/CompositeBlockEvents/getTotalPeriodicSelfStakeAndWithdraw/post.js';

const router: Router = express.Router();

router.post(
  '/get_total_periodic_self_stake_and_withdraw', 
  getTotalPeriodicSelfStakeAndWithdrawPostController
);

export default router;
