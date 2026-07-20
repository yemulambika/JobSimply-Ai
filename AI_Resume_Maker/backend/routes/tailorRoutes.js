import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validation.js';
import { tailorSchema } from '../middleware/validation.js';
import { tailorResume, getTailorHistory } from '../controllers/tailorController.js';

const router = express.Router();

router.post('/', authenticateToken, aiLimiter, validateBody(tailorSchema), tailorResume);
router.get('/history', authenticateToken, getTailorHistory);

export default router;