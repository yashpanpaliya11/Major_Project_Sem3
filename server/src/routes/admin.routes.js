import { Router } from 'express';
import {
  getDashboard,
  getProxyAlerts,
  updateProxyAlert,
  getAuditLogs,
} from '../controllers/admin.controller.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';

const router = Router();

// Protect all admin routes with authentication and ADMIN role check
router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', getDashboard);
router.get('/proxy-alerts', getProxyAlerts);
router.patch('/proxy-alerts/:id', updateProxyAlert);
router.get('/audit-logs', getAuditLogs);

export default router;

