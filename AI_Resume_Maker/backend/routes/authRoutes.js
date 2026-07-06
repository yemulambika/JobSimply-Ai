import express from 'express';
import { getSession, currentUser, login, logout, refresh, register } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Session check - for extension to detect if user is logged in
router.get('/session', getSession);
router.get('/me', authenticateToken, currentUser);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;