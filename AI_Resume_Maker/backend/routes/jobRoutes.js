import express from 'express';
import { aggregateAndStoreJobs, listStoredJobs, getJobByIdHandler, triggerFetchNow } from '../controllers/jobController.js';
import { analyzeJob, addToLoop, getLoop, deleteFromLoop, tailorJobResume, generateJobCoverLetter } from '../controllers/jobAnalysisController.js';
import { extractJobAndAnalyze } from '../controllers/jobExtractionController.js';
import { getTailoredResumes, getTailoredResumeById } from '../controllers/tailoredResumeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.get('/aggregate', aggregateAndStoreJobs);
router.post('/fetch-now', triggerFetchNow); // Manual cron trigger (admin/dev)
router.get('/', listStoredJobs);
router.get('/search', listStoredJobs);

// Extension endpoint - ONLY endpoint for extension
// Extension sends job JSON, backend stores it and returns analysis
router.post('/extract', authenticateToken, extractJobAndAnalyze);

// Get job by ID (for TailoredJobPage) - needs auth
router.get('/:id', authenticateToken, getJobByIdHandler);

// Tailored resume endpoints
router.get('/tailored-resumes', authenticateToken, getTailoredResumes);
router.get('/tailored-resumes/:id', authenticateToken, getTailoredResumeById);

// Legacy endpoints (used by website dashboard)
router.post('/analyze', authenticateToken, analyzeJob);
router.post('/tailor', authenticateToken, tailorJobResume);
router.post('/cover-letter', authenticateToken, generateJobCoverLetter);
router.post('/loop', authenticateToken, addToLoop);
router.get('/loop', authenticateToken, getLoop);
router.delete('/loop/:id', authenticateToken, deleteFromLoop);

export default router;