import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, getAdminStats, listUsers, getAnalytics } from '../controllers/adminController.js';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.get('/analytics', getAnalytics);

export default router;