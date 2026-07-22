import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getTrackerJobs,
  getTrackerStats,
  updateTrackerStatus,
  addTimelineEntry,
  removeFromTracker,
  exportTracker,
  JOB_STATUSES,
  STATUS_CONFIG
} from '../controllers/jobTrackerController.js';

const router = express.Router();

// Get all tracked jobs with optional filters
router.get('/', authenticateToken, getTrackerJobs);

// Get tracker statistics
router.get('/stats', authenticateToken, getTrackerStats);

// Export tracker data as CSV
router.get('/export', authenticateToken, exportTracker);

// Update tracker status
router.patch('/:jobId', authenticateToken, updateTrackerStatus);

// Add timeline entry
router.post('/:jobId/timeline', authenticateToken, addTimelineEntry);

// Remove from tracker
router.delete('/:jobId', authenticateToken, removeFromTracker);

// Get available statuses (for UI)
router.get('/statuses', (req, res) => {
  res.status(200).json({
    success: true,
    statuses: JOB_STATUSES,
    config: STATUS_CONFIG
  });
});

export default router;
