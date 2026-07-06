import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { tailorResume, getTailorHistory } from '../controllers/tailorController.js';

const router = express.Router();

router.post('/', authenticateToken, tailorResume);
router.get('/history', authenticateToken, getTailorHistory);

export default router;