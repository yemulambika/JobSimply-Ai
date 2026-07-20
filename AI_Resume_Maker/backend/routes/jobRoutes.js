import express from 'express';
import { aggregateAndStoreJobs, listStoredJobs, getJobByIdHandler, listUserSavedJobs } from '../controllers/jobController.js';
import { analyzeJob, addToLoop, getLoop, deleteFromLoop, tailorJobResume, generateJobCoverLetter } from '../controllers/jobAnalysisController.js';
import { extractJobAndAnalyze } from '../controllers/jobExtractionController.js';
import { getTailoredResumes, getTailoredResumeById } from '../controllers/tailoredResumeController.js';
import { tailorCustomResume } from '../controllers/tailoredCustomResumeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validation.js';
import { jobExtractionSchema, tailorCustomSchema } from '../middleware/validation.js';

const router = express.Router();
router.get('/aggregate', aggregateAndStoreJobs);
router.get('/', listStoredJobs);
router.get('/search', listStoredJobs);

// Extension endpoint - ONLY endpoint for extension
// Extension sends job JSON, backend stores it and returns analysis
router.post('/extract', authenticateToken, aiLimiter, validateBody(jobExtractionSchema), extractJobAndAnalyze);

// Get user's saved jobs (from extension) - needs auth
router.get('/saved', authenticateToken, listUserSavedJobs);

// Tailored resume endpoints
router.get('/tailored-resumes', authenticateToken, getTailoredResumes);
router.get('/tailored-resumes/:id', authenticateToken, getTailoredResumeById);

// New 4-step workflow endpoint
router.post('/tailor-custom', authenticateToken, aiLimiter, validateBody(tailorCustomSchema), tailorCustomResume);

// Loop endpoints
router.post('/loop', authenticateToken, addToLoop);
router.get('/loop', authenticateToken, getLoop);
router.delete('/loop/:id', authenticateToken, deleteFromLoop);

// Legacy endpoints (used by website dashboard)
router.post('/analyze', authenticateToken, aiLimiter, analyzeJob);
router.post('/tailor', authenticateToken, aiLimiter, tailorJobResume);
router.post('/cover-letter', authenticateToken, aiLimiter, generateJobCoverLetter);

// Get job by ID must come AFTER specific routes so it does not swallow /tailored-resumes
router.get('/:id', authenticateToken, getJobByIdHandler);

export default router;
