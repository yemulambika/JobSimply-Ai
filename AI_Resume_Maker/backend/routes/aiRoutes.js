import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  generateAnswers, 
  generateSingleAnswer, 
  improveText, 
  saveAnswer,
  analyzeJobForAnswers 
} from '../controllers/aiAnswersController.js';

const router = express.Router();

// Generate answers for multiple questions
router.post('/generate-answers', authenticateToken, generateAnswers);

// Generate a single answer
router.post('/generate-answer', authenticateToken, generateSingleAnswer);

// Improve/edit existing text
router.post('/improve', authenticateToken, improveText);

// Save generated answer to profile
router.post('/save-answer', authenticateToken, saveAnswer);

// Analyze job description for answer suggestions
router.post('/analyze-job', authenticateToken, analyzeJobForAnswers);

export default router;
