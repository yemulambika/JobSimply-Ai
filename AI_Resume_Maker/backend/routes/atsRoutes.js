import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeResume, analyzeResumeSimple, getAnalysisHistory, getAnalysis } from '../controllers/atsController.js';

const router = express.Router();

router.post('/analyze', authenticateToken, analyzeResume);
router.post('/analyze-simple', authenticateToken, analyzeResumeSimple);
router.get('/history', authenticateToken, getAnalysisHistory);
router.get('/:id', authenticateToken, getAnalysis);

export default router;