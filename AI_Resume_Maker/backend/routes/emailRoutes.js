import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateEmail, listEmails, getEmail } from '../controllers/emailController.js';

const router = express.Router();

router.post('/', authenticateToken, generateEmail);
router.get('/', authenticateToken, listEmails);
router.get('/:id', authenticateToken, getEmail);

export default router;