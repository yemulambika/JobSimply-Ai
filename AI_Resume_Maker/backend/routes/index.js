import express from 'express';
import { healthCheck } from '../controllers/healthController.js';
import authRoutes from './authRoutes.js';
import resumeRoutes from './resumeRoutes.js';
import jobRoutes from './jobRoutes.js';
import atsRoutes from './atsRoutes.js';
import tailorRoutes from './tailorRoutes.js';
import semanticAtsRoutes from './semanticAtsRoutes.js';
import coverLetterRoutes from './coverLetterRoutes.js';
import emailRoutes from './emailRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import savedJobRoutes from './savedJobRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import profileRoutes from './profileRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import interviewRoutes from './interviewRoutes.js';
import adminRoutes from './adminRoutes.js';
import aiRoutes from './aiRoutes.js';
import jobTrackerRoutes from './jobTrackerRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/api/resumes', resumeRoutes); // Extension uses /api/resumes/latest
router.use('/resumes', resumeRoutes); // Frontend compatibility
router.use('/api/jobs', jobRoutes);
router.use('/ats', atsRoutes);
router.use('/semantic-ats', semanticAtsRoutes);
router.use('/tailor', tailorRoutes);
router.use('/api/tailor', tailorRoutes); // Extension compatibility
router.use('/coverletters', coverLetterRoutes);
router.use('/api/coverletters', coverLetterRoutes); // Extension compatibility
router.use('/emails', emailRoutes);
router.use('/applications', applicationRoutes);
router.use('/api/applications', applicationRoutes); // Extension compatibility
router.use('/saved-jobs', savedJobRoutes);
router.use('/settings', settingsRoutes);
router.use('/profile', profileRoutes);
router.use('/api/profile', profileRoutes); // Extension compatibility
router.use('/notifications', notificationRoutes);
router.use('/interviews', interviewRoutes);
router.use('/admin', adminRoutes);
router.use('/api/ai', aiRoutes); // AI endpoints for extension
router.use('/api/tracker', jobTrackerRoutes); // Job tracker endpoints
router.get('/api/health', healthCheck);
router.get('/health', healthCheck);
router.get('/', healthCheck);

export default router;