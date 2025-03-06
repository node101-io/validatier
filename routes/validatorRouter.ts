import express, { Router } from 'express';
import rankValidatorsGetController from '../controllers/Validator/rankValidators/get.js';

const router: Router = express.Router();

router.get(
  '/rank_validators', 
  rankValidatorsGetController
);

export default router;
