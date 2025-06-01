import express, { Router } from 'express';
import rankValidatorsGetController from '../controllers/Validator/rankValidators/get.js';
import exportValidatorsGetController from '../controllers/Validator/exportCsv/get.js';
import getGraphDataGetController from '../controllers/Validator/getGraphData/get.js';
import contactGetController from '../controllers/Validator/contact/get.js';

const router: Router = express.Router();

router.get(
  '/rank_validators', 
  rankValidatorsGetController
);

router.get(
  '/export_csv',
  exportValidatorsGetController
);

router.get(
  '/get_graph_data',
  getGraphDataGetController
)

router.get(
  '/contact',
  contactGetController
)

export default router;
