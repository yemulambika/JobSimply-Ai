import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateBody, coverLetterSchema } from '../middleware/validation.js';
import { generateCoverLetter, listCoverLetters, getCoverLetter } from '../controllers/coverLetterController.js';

const router = express.Router();

router.post('/', authenticateToken, aiLimiter, validateBody(coverLetterSchema), generateCoverLetter);
router.get('/', authenticateToken, listCoverLetters);
router.get('/:id', authenticateToken, getCoverLetter);

export default router;