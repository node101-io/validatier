import express, { Router } from 'express';
import getValidatorsGetController from '../controllers/Validator/getValidators/get.js';

const router: Router = express.Router();

router.get(
  '/get_validators', 
  getValidatorsGetController
);

export default router;
