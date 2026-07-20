import express from 'express';
import { getSession, currentUser, login, logout, refresh, register } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validation.js';
import { registerSchema, loginSchema } from '../middleware/validation.js';

const router = express.Router();

// Session check - for extension to detect if user is logged in
router.get('/session', getSession);
router.get('/me', authenticateToken, currentUser);
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);

export default router;
