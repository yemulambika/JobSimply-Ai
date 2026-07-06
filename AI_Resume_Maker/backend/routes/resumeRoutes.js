import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  upload,
  uploadResume,
  listResumes,
  getResume,
  getLatestResume,
  getActiveResume,
  renameResume,
  removeResume,
  activateResume,
  replaceResumeFile,
  exportResume,
  exportTailoredResume,
  exportCoverLetter,
} from '../controllers/resumeController.js';

const router = express.Router();

router.post('/upload', authenticateToken, upload.single('file'), uploadResume);
router.get('/', authenticateToken, listResumes);
router.get('/latest', authenticateToken, getLatestResume);
router.get('/active', authenticateToken, getActiveResume);
router.get('/:id', authenticateToken, getResume);
router.get('/:id/export/:format', authenticateToken, exportResume);
router.get('/tailored/:id/export/:format', authenticateToken, exportTailoredResume);
router.get('/cover-letter/:id/export/:format', authenticateToken, exportCoverLetter);
router.patch('/:id/rename', authenticateToken, renameResume);
router.delete('/:id', authenticateToken, removeResume);
router.patch('/:id/activate', authenticateToken, activateResume);
router.post('/:id/replace', authenticateToken, upload.single('file'), replaceResumeFile);

export default router;