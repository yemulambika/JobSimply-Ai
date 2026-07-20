import { Router } from 'express';
import {
  upload,
  uploadResume,
  getResume,
  listResumes,
  updateResume,
  tailorResume,
  getVersionHistory,
  restoreVersion,
  removeResume,
  downloadResume,
} from '../controllers/resumeControllerV2.js';

const router = Router();

// Public routes (require auth middleware in actual usage)
// POST /api/v2/resumes/upload - Upload and parse resume
router.post('/upload', upload.single('file'), uploadResume);

// GET /api/v2/resumes - List all resumes
router.get('/', listResumes);

// GET /api/v2/resumes/:id - Get specific resume
router.get('/:id', getResume);

// PATCH /api/v2/resumes/:id - Update resume JSON
router.patch('/:id', updateResume);

// POST /api/v2/resumes/:id/tailor - Tailor resume for job
router.post('/:id/tailor', tailorResume);

// GET /api/v2/resumes/:id/versions - Get version history
router.get('/:id/versions', getVersionHistory);

// POST /api/v2/resumes/:id/versions/:version/restore - Restore version
router.post('/:id/versions/:version/restore', restoreVersion);

// DELETE /api/v2/resumes/:id - Delete resume
router.delete('/:id', removeResume);

// GET /api/v2/resumes/:id/download/:format - Download resume (html, markdown, txt, pdf)
router.get('/:id/download/:format', downloadResume);

export default router;