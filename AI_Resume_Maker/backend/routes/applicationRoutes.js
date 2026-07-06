import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  getApplicationStats,
} from '../controllers/applicationController.js';

const router = express.Router();

router.post('/', authenticateToken, createApplication);
router.get('/', authenticateToken, listApplications);
router.get('/stats', authenticateToken, getApplicationStats);
router.get('/:id', authenticateToken, getApplication);
router.patch('/:id', authenticateToken, updateApplication);
router.delete('/:id', authenticateToken, deleteApplication);

export default router;