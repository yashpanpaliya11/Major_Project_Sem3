import { Router } from 'express';
import {
  getReport,
  getInterventionList,
  generateAlert,
} from '../controllers/attendance.controller.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Reports and interventions for Admin & Faculty
router.get('/report', authorize('ADMIN', 'FACULTY'), getReport);
router.get('/interventions', authorize('ADMIN', 'FACULTY'), getInterventionList);
router.post('/generate-alert', authorize('ADMIN', 'FACULTY'), generateAlert);

export default router;

