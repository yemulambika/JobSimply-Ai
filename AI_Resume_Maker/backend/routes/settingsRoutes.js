import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getSettings, updateSettings, getPreferences } from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', authenticateToken, getSettings);
router.patch('/', authenticateToken, updateSettings);
router.get('/preferences', authenticateToken, getPreferences);

export default router;