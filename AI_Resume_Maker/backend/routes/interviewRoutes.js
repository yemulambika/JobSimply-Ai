import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createInterviewPrep,
  listInterviewPreps,
  getInterviewPrep,
  deleteInterviewPrep,
} from '../controllers/interviewController.js';

const router = express.Router();

router.post('/', authenticateToken, createInterviewPrep);
router.get('/', authenticateToken, listInterviewPreps);
router.get('/:id', authenticateToken, getInterviewPrep);
router.delete('/:id', authenticateToken, deleteInterviewPrep);

export default router;