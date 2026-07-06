import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { saveJob, listSavedJobs, removeSavedJob, checkSavedJob } from '../controllers/savedJobController.js';

const router = express.Router();

router.post('/', authenticateToken, saveJob);
router.get('/', authenticateToken, listSavedJobs);
router.get('/check/:jobId', authenticateToken, checkSavedJob);
router.delete('/:id', authenticateToken, removeSavedJob);

export default router;