import multer from 'multer';
import { uploadToCloudinary } from '../services/cloudinary.js';
import {
  saveResumeMetadata,
  getUserResumes,
  getResumeById,
  getLatestResume as getLatestResumeFromDb,
  updateResumeTitle,
  deleteResume,
  markResumeActive,
  replaceResume,
} from '../services/postgres.js';
import {
  generateHtmlResume,
  generateTextResume,
  generateHtmlCoverLetter,
  generateTextCoverLetter,
  saveExportHistory,
  saveCoverLetterExportHistory,
} from '../services/atsExporter.js';
import { resumeParserService } from '../services/ResumeParserService.js';
import { extractResume } from '../src/services/ai/aiProvider.js';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
      return;
    }
    cb(new Error('Only PDF files are allowed'));
  },
});

// POST /resumes/upload — Upload + parse new resume
export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    const fileUrl = cloudinaryResult.secure_url;

    const originalText = await resumeParserService.extractTextFromPdf(req.file.buffer);
    let parsedData;
    try {
      parsedData = await extractResume(originalText);
    } catch (error) {
      if (error.message === 'AI providers unavailable') {
        return res.status(503).json({
          success: false,
          message: 'AI providers unavailable',
        });
      }
      throw error;
    }

    // Log parsed data structure for verification
    console.log('[RESUME] Upload - Parsed data structure:', {
      hasPersonalInfo: !!parsedData.personalInfo,
      hasSummary: !!parsedData.summary,
      hasSkills: !!parsedData.skills,
      educationCount: parsedData.education?.length || 0,
      experienceCount: parsedData.experience?.length || 0,
      projectsCount: parsedData.projects?.length || 0,
      certificationsCount: parsedData.certifications?.length || 0,
      achievementsCount: parsedData.achievements?.length || 0,
      languagesCount: parsedData.languages?.length || 0,
      linksCount: Object.keys(parsedData.links || {}).length > 0,
      customSectionsCount: parsedData.customSections?.length || 0,
      internshipsCount: parsedData.internships?.length || 0,
      publicationsCount: parsedData.publications?.length || 0,
      researchCount: parsedData.research?.length || 0,
      volunteeringCount: parsedData.volunteering?.length || 0,
      leadershipCount: parsedData.leadership?.length || 0,
    });

    const { skills, experience, education, projects, summary } = parsedData;

    const resume = await saveResumeMetadata({
      userId: req.user.id,
      title: req.body.title || parsedData.name || req.file.originalname.replace(/\.pdf$/i, ''),
      fileUrl,
      originalText,
      parsedData,
      skills,
      experience,
      education,
      projects,
      summary,
    });

    res.status(201).json({
      message: 'Resume uploaded and parsed successfully',
      resumeId: resume.id,
      fileUrl: resume.fileUrl,
      parsedData: resume.parsedData,
    });
  } catch (error) {
    console.error('[RESUME] Upload error:', error);
    next(error);
  }
};

// GET /resumes — List all resumes for the authenticated user
export const listResumes = async (req, res, next) => {
  try {
    console.log('[RESUME] listResumes - userId:', req.user.id);
    const resumes = await getUserResumes(req.user.id);
    console.log('[RESUME] listResumes - Found resumes:', resumes.length);
    res.status(200).json({ resumes });
  } catch (error) {
    console.error('[RESUME] listResumes error:', error);
    next(error);
  }
};

// GET /resumes/active — Get user's active resume
export const getActiveResume = async (req, res, next) => {
  try {
    console.log('[RESUME] getActiveResume - userId:', req.user.id);
    const resume = await getLatestResumeFromDb(req.user.id);
    
    if (!resume) {
      console.log('[RESUME] getActiveResume - No resume found for user:', req.user.id);
      return res.status(404).json({ 
        success: false,
        message: 'No resume found. Please upload a resume first.' 
      });
    }
    
    console.log('[RESUME] getActiveResume - Found resume:', { id: resume.id, title: resume.title, hasSkills: !!resume.skills, hasParsedData: !!resume.parsedData });
    res.status(200).json({
      success: true,
      ...resume,
    });
  } catch (error) {
    console.error('[RESUME] getActiveResume error:', error);
    next(error);
  }
};

// GET /resumes/latest — Get user's active or latest resume
export const getLatestResume = async (req, res, next) => {
  try {
    console.log('[RESUME] getLatestResume - userId:', req.user.id);
    const resume = await getLatestResumeFromDb(req.user.id);
    
    if (!resume) {
      console.log('[RESUME] getLatestResume - No resume found for user:', req.user.id);
      return res.status(404).json({ 
        success: false,
        message: 'No resume found. Please upload a resume first.' 
      });
    }
    
    console.log('[RESUME] getLatestResume - Found resume:', { id: resume.id, title: resume.title, hasSkills: !!resume.skills, hasParsedData: !!resume.parsedData });
    res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error('[RESUME] getLatestResume error:', error);
    next(error);
  }
};

// GET /resumes/:id — Get a single resume with full details
export const getResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('[RESUME] getResume - id:', id, 'userId:', req.user.id);
    const resume = await getResumeById(Number(id), req.user.id);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.status(200).json({ resume });
  } catch (error) {
    next(error);
  }
};

// PATCH /resumes/:id/rename — Rename resume title
export const renameResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const updated = await updateResumeTitle(Number(id), req.user.id, title.trim());
    if (!updated) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.status(200).json({ message: 'Resume renamed successfully', resume: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /resumes/:id — Delete a resume
export const removeResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteResume(Number(id), req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.status(200).json({ message: 'Resume deleted successfully', resumeId: deleted.id });
  } catch (error) {
    next(error);
  }
};

// PATCH /resumes/:id/activate — Mark resume as active
export const activateResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activated = await markResumeActive(Number(id), req.user.id);
    if (!activated) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    res.status(200).json({ message: 'Resume activated successfully', resume: activated });
  } catch (error) {
    next(error);
  }
};

// POST /resumes/:id/replace — Replace resume file (re-upload + re-parse)
export const replaceResumeFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    const fileUrl = cloudinaryResult.secure_url;

    const originalText = await resumeParserService.extractTextFromPdf(req.file.buffer);
    let parsedData;
    try {
      parsedData = await extractResume(originalText);
    } catch (error) {
      if (error.message === 'AI providers unavailable') {
        return res.status(503).json({
          success: false,
          message: 'AI providers unavailable',
        });
      }
      throw error;
    }

    // Log parsed data structure for verification
    console.log('[RESUME] Replace - Parsed data structure:', {
      hasPersonalInfo: !!parsedData.personalInfo,
      hasSummary: !!parsedData.summary,
      hasSkills: !!parsedData.skills,
      educationCount: parsedData.education?.length || 0,
      experienceCount: parsedData.experience?.length || 0,
      projectsCount: parsedData.projects?.length || 0,
      certificationsCount: parsedData.certifications?.length || 0,
      achievementsCount: parsedData.achievements?.length || 0,
      languagesCount: parsedData.languages?.length || 0,
      linksCount: Object.keys(parsedData.links || {}).length > 0,
      customSectionsCount: parsedData.customSections?.length || 0,
      internshipsCount: parsedData.internships?.length || 0,
      publicationsCount: parsedData.publications?.length || 0,
      researchCount: parsedData.research?.length || 0,
      volunteeringCount: parsedData.volunteering?.length || 0,
      leadershipCount: parsedData.leadership?.length || 0,
    });

    const { skills, experience, education, projects, summary } = parsedData;

    const updated = await replaceResume(Number(id), req.user.id, {
      title: req.body.title || parsedData.name || req.file.originalname.replace(/\.pdf$/i, ''),
      fileUrl,
      originalText,
      parsedData,
      skills,
      experience,
      education,
      projects,
      summary,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.status(200).json({
      message: 'Resume replaced and re-parsed successfully',
      resume: updated,
      parsedData: updated.parsedData,
    });
  } catch (error) {
    console.error('Error in replaceResumeFile:', error);
    next(error);
  }
};

// GET /resumes/:id/export/:format - Export resume (html, pdf, docx)
export const exportResume = async (req, res, next) => {
  try {
    const { id, format } = req.params;
    console.log('[RESUME] exportResume - id:', id, 'format:', format, 'userId:', req.user.id);
    
    const resume = await getResumeById(Number(id), req.user.id);
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    let content;
    let contentType;
    let filename;
    
    switch (format.toLowerCase()) {
      case 'html':
      case 'pdf':
        content = generateHtmlResume(resume);
        contentType = 'text/html';
        filename = `resume-${id}.html`;
        break;
      
      case 'docx':
      case 'text':
        content = generateTextResume(resume);
        contentType = 'text/plain';
        filename = `resume-${id}.txt`;
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid format. Use: html, pdf, or docx' });
    }
    
    await saveExportHistory(req.user.id, resume.id, format, null);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(content);
  } catch (error) {
    console.error('[RESUME] exportResume error:', error);
    next(error);
  }
};

// GET /resumes/tailored/:id/export/:format - Export tailored resume
export const exportTailoredResume = async (req, res, next) => {
  try {
    const { id, format } = req.params;
    
    const client = await import('../services/postgres.js').then(m => m.getPool()).then(p => p.connect());
    try {
      const result = await client.query(
        'SELECT * FROM "TailoredResume" WHERE id = $1 AND "userId" = $2',
        [id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Tailored resume not found' });
      }
      
      const tailored = result.rows[0];
      
      let content;
      let contentType;
      let filename;
      
      switch (format.toLowerCase()) {
        case 'html':
        case 'pdf':
          content = generateHtmlResume({ tailored: JSON.parse(tailored.content) });
          contentType = 'text/html';
          filename = `tailored-resume-${id}.html`;
          break;
        
        case 'docx':
        case 'text':
          content = generateTextResume({ tailored: JSON.parse(tailored.content) });
          contentType = 'text/plain';
          filename = `tailored-resume-${id}.txt`;
          break;
        
        default:
          return res.status(400).json({ message: 'Invalid format. Use: html, pdf, or docx' });
      }
      
      await saveExportHistory(req.user.id, tailored.resumeId, format, Number(id));
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(content);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /cover-letter/:id/export/:format - Export cover letter
export const exportCoverLetter = async (req, res, next) => {
  try {
    const { id, format } = req.params;
    
    const client = await import('../services/postgres.js').then(m => m.getPool()).then(p => p.connect());
    try {
      const result = await client.query(
        'SELECT * FROM "CoverLetter" WHERE id = $1 AND "userId" = $2',
        [id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Cover letter not found' });
      }
      
      const coverLetter = result.rows[0];
      
      let content;
      let contentType;
      let filename;
      
      switch (format.toLowerCase()) {
        case 'html':
        case 'pdf':
          content = generateHtmlCoverLetter({
            content: coverLetter.content,
            company: coverLetter.company,
            position: coverLetter.position
          });
          contentType = 'text/html';
          filename = `cover-letter-${id}.html`;
          break;
        
        case 'docx':
        case 'text':
          content = generateTextCoverLetter({
            content: coverLetter.content,
            company: coverLetter.company,
            position: coverLetter.position
          });
          contentType = 'text/plain';
          filename = `cover-letter-${id}.txt`;
          break;
        
        default:
          return res.status(400).json({ message: 'Invalid format. Use: html, pdf, or docx' });
      }
      
      await saveCoverLetterExportHistory(req.user.id, coverLetter.id, format);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(content);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};