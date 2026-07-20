/**
 * Semantic ATS Routes - Routes for semantic similarity-based resume analysis
 */

import express from 'express';
import {
  analyzeSemantic,
  tailorSemantic,
  generateResumeEmbeddings,
  generateJobEmbeddings,
  findSimilarJobs,
} from '../controllers/semanticAtsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /semantic-ats/analyze
 * Analyze resume against job using semantic similarity
 */
router.post('/analyze', analyzeSemantic);

/**
 * POST /semantic-ats/tailor
 * Tailor resume using semantic analysis
 */
router.post('/tailor', tailorSemantic);

/**
 * POST /semantic-ats/embeddings/generate
 * Generate embeddings for a resume
 */
router.post('/embeddings/generate', generateResumeEmbeddings);

/**
 * POST /semantic-ats/embeddings/job
 * Generate embeddings for a job
 */
router.post('/embeddings/job', generateJobEmbeddings);

/**
 * GET /semantic-ats/similar-jobs
 * Find jobs similar to a resume using embeddings
 */
router.get('/similar-jobs', findSimilarJobs);

export default router;
