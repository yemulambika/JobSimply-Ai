import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateCoverLetter, listCoverLetters, getCoverLetter } from '../controllers/coverLetterController.js';

const router = express.Router();

router.post('/', authenticateToken, generateCoverLetter);
router.get('/', authenticateToken, listCoverLetters);
router.get('/:id', authenticateToken, getCoverLetter);

export default router;