import express, { Router } from 'express';
import rankValidatorsGetController from '../controllers/Validator/rankValidators/get.js';
import exportValidatorsGetController from '../controllers/Validator/exportCsv/get.js';

const router: Router = express.Router();

router.get(
  '/rank_validators', 
  rankValidatorsGetController
);

router.get(
  '/export_csv',
  exportValidatorsGetController
);

export default router;
