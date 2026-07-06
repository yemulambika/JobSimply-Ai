import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getProfile, updateProfile, deleteProfile } from '../controllers/profileController.js';

const router = express.Router();

router.get('/', authenticateToken, getProfile);
router.put('/', authenticateToken, updateProfile);
router.patch('/', authenticateToken, updateProfile);
router.delete('/', authenticateToken, deleteProfile);

export default router;