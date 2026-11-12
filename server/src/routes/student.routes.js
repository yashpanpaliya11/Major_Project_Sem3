import { Router } from 'express';
import {
  getDashboard,
  scanQR,
  faceVerify,
  biometricVerify,
  respondEngagementPing,
  getNotifications,
  markNotificationRead,
  getAttendanceHistory,
} from '../controllers/student.controller.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, authorize('STUDENT'));

router.get('/dashboard', getDashboard);
router.post('/scan-qr', scanQR);
router.post('/face-verify', faceVerify);
router.post('/biometric-verify', biometricVerify);
router.post('/engagement/respond', respondEngagementPing);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.get('/history', getAttendanceHistory);

export default router;
