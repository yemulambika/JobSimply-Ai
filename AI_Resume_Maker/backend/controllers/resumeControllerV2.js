import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { universalParser } from '../services/UniversalResumeParser.js';
import {
  createResume,
  getResumeById,
  getUserResumes,
  getActiveResume,
  updateResumeJSON,
  createTailoredResume,
  getTailoredResumeById,
  getTailoredVersions,
  saveResumeVersion,
  getResumeVersions,
  restoreResumeVersion,
  deleteResume,
  updateResumeTemplate,
} from '../repositories/resumeRepository.js';
import { calculateAtsScore, matchJobKeywords } from '../services/atsEngine.js';
import { renderToHtml, renderToText, renderToMarkdown } from '../services/resumeRenderer.js';
import { uploadToCloudinary } from '../services/cloudinary.js';

const prisma = new PrismaClient();

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/rtf',
      'text/html',
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|doc|txt|rtf|html?)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Supported: PDF, DOCX, DOC, TXT, RTF, HTML'));
    }
  },
});

// ============================================================
// RESUME UPLOAD - Parse and store JSON
// ============================================================

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload original file to Cloudinary
    let fileUrl = null;
    try {
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      fileUrl = cloudinaryResult.secure_url;
    } catch (uploadError) {
      console.warn('Cloudinary upload failed, continuing without file URL:', uploadError.message);
    }

    // Parse resume
    const parsed = await universalParser.parseResume(req.file.buffer, req.file.originalname);
    
    // Create resume in database
    const resume = await createResume({
      userId: req.user.id,
      title: req.body.title || parsed.personalInfo?.name || req.file.originalname.replace(/\.[^/.]+$/, ''),
      fileUrl,
      originalFilename: req.file.originalname,
      baseResumeJSON: parsed,
    });

    // Update status to active if first resume
    const resumes = await getUserResumes(req.user.id);
    if (resumes.length === 1) {
      await updateResumeStatus(resume.id, req.user.id, 'active');
    }

    // Calculate initial ATS score
    const atsScore = calculateAtsScore(parsed);

    res.status(201).json({
      success: true,
      message: 'Resume uploaded and parsed successfully',
      resumeId: resume.id,
      resumeJSON: parsed,
      atsScore,
      fileUrl,
    });
  } catch (error) {
    console.error('[RESUME V2] Upload error:', error);
    next(error);
  }
};

// ============================================================
// GET RESUME
// ============================================================

export const getResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resume = await getResumeById(parseInt(id), req.user.id);
    
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Get ATS score from base resume JSON
    const atsScore = calculateAtsScore(resume.baseResumeJSON);

    res.status(200).json({
      success: true,
      resume: {
        id: resume.id,
        title: resume.title,
        template: resume.template,
        status: resume.status,
        fileUrl: resume.fileUrl,
        resumeJSON: resume.baseResumeJSON,
        tailoredResumeJSON: resume.tailoredResumeJSON,
        atsScore,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// LIST RESUMES
// ============================================================

export const listResumes = async (req, res, next) => {
  try {
    const resumes = await getUserResumes(req.user.id);
    
    // Add ATS scores
    const resumesWithScores = resumes.map(r => ({
      ...r,
      atsScore: calculateAtsScore(r.baseResumeJSON),
    }));

    res.status(200).json({
      success: true,
      resumes: resumesWithScores,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE RESUME JSON
// ============================================================

export const updateResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resumeJSON, template } = req.body;

    const updated = await updateResumeJSON(parseInt(id), req.user.id, resumeJSON);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Auto-save version
    await saveResumeVersion(parseInt(id), resumeJSON, 'Auto-saved change');

    // Update template if provided
    if (template) {
      await updateResumeTemplate(parseInt(id), req.user.id, template);
    }

    // Recalculate ATS score
    const atsScore = calculateAtsScore(resumeJSON);

    res.status(200).json({
      success: true,
      message: 'Resume updated successfully',
      resumeJSON,
      atsScore,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// TAILOR RESUME
// Creates separate tailored JSON without modifying base
// ============================================================

export const tailorResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      jobId, 
      jobDescription, 
      selectedSections = [], 
      selectedKeywords = [],
      tone = 'professional',
      optimizationLevel = 'balanced' 
    } = req.body;

    // Get base resume
    const resume = await getResumeById(parseInt(id), req.user.id);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Clone base JSON
    const tailoredJSON = JSON.parse(JSON.stringify(resume.baseResumeJSON));

    // Apply optimizations
    if (selectedSections.includes('keywords') && selectedKeywords.length > 0) {
      tailoredJSON.keywords = [...new Set([...(tailoredJSON.keywords || []), ...selectedKeywords])];
    }

    if (selectedSections.includes('summary')) {
      tailoredJSON.summary = optimizeSummary(tailoredJSON.summary, jobDescription, tone);
    }

    if (selectedSections.includes('skills') && selectedKeywords.length > 0) {
      tailoredJSON.skills = optimizeSkillsForJob(tailoredJSON.skills, selectedKeywords);
    }

    if (selectedSections.includes('experience') && selectedKeywords.length > 0) {
      tailoredJSON.experience = optimizeExperienceForJob(tailoredJSON.experience, selectedKeywords, optimizationLevel);
    }

    if (selectedSections.includes('projects') && selectedKeywords.length > 0) {
      tailoredJSON.projects = optimizeProjectsForJob(tailoredJSON.projects, selectedKeywords, optimizationLevel);
    }

    // Calculate ATS score for tailored version
    const atsScore = calculateAtsScore(tailoredJSON);
    const keywordMatch = matchJobKeywords(tailoredJSON, jobDescription);

    // Create tailored resume record
    const tailored = await createTailoredResume({
      userId: req.user.id,
      resumeId: parseInt(id),
      jobId,
      title: jobId ? `Tailored for Application #${jobId}` : 'Custom Tailored Version',
      jobDescription,
      content: tailoredJSON,
      atsScore,
      matchScore: keywordMatch.matchScore,
    });

    // Update resume's tailored JSON reference
    await prisma.resume.update({
      where: { id: parseInt(id) },
      data: { tailoredResumeJSON: tailoredJSON },
    });

    res.status(200).json({
      success: true,
      tailoredResumeId: tailored.id,
      resumeJSON: tailoredJSON,
      atsScore,
      matchScore: keywordMatch.matchScore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optimize summary for job description
 */
function optimizeSummary(summary, jobDescription, tone) {
  if (!summary) return summary;
  
  const prefixes = {
    professional: 'Results-driven professional with expertise in ',
    concise: 'Experienced in ',
    detailed: 'Highly skilled professional specializing in ',
    casual: 'Passionate professional with experience in ',
  };
  
  const prefix = prefixes[tone] || prefixes.professional;
  
  // Add relevant keywords to summary
  if (jobDescription && !summary.toLowerCase().includes(prefix.toLowerCase())) {
    return prefix + summary;
  }
  
  return summary;
}

/**
 * Optimize skills for job keywords
 */
function optimizeSkillsForJob(skills, keywords) {
  if (!skills) return skills;
  
  const allSkills = [...Object.values(skills).flat()];
  const optimized = { ...skills };
  
  // Prioritise job keywords
  if (keywords.length > 0) {
    optimized.other = [...keywords.filter(k => !allSkills.some(s => s.toLowerCase().includes(k.toLowerCase())))];
  }
  
  return optimized;
}

/**
 * Optimize experience for job keywords
 */
function optimizeExperienceForJob(experience, keywords, optimizationLevel) {
  if (!experience) return experience;
  
  return experience.map(exp => {
    if (optimizationLevel === 'conservative') return exp;
    
    const optimized = { ...exp };
    if (exp.bullets && keywords.length > 0) {
      optimized.bullets = exp.bullets.map(bullet => {
        for (const keyword of keywords) {
          if (!bullet.toLowerCase().includes(keyword.toLowerCase())) {
            return `${bullet} | Applied ${keyword} for enhanced results.`;
          }
        }
        return bullet;
      });
    }
    return optimized;
  });
}

/**
 * Optimize projects for job keywords
 */
function optimizeProjectsForJob(projects, keywords, optimizationLevel) {
  if (!projects) return projects;
  
  return projects.map(proj => {
    if (optimizationLevel === 'conservative') return proj;
    
    const optimized = { ...proj };
    if (proj.technologies && keywords.length > 0) {
      optimized.technologies = [...new Set([...proj.technologies, ...keywords])];
    }
    return optimized;
  });
}

// ============================================================
// GET VERSION HISTORY
// ============================================================

export const getVersionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const versions = await getResumeVersions(parseInt(id), req.user.id);
    
    res.status(200).json({
      success: true,
      versions,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RESTORE VERSION
// ============================================================

export const restoreVersion = async (req, res, next) => {
  try {
    const { id, version } = req.params;
    const restored = await restoreResumeVersion(parseInt(id), req.user.id, parseInt(version));
    
    if (!restored) {
      return res.status(404).json({ success: false, message: 'Version not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Version restored successfully',
      resumeJSON: restored.baseResumeJSON,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE RESUME
// ============================================================

export const removeResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteResume(parseInt(id), req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DOWNLOAD RESUME - HTML, PDF, DOCX, TXT, Markdown
// ============================================================

export const downloadResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format, useTailored } = req.query;
    
    const resume = await getResumeById(parseInt(id), req.user.id);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Use tailored or base JSON
    const resumeJSON = useTailored === 'true' && resume.tailoredResumeJSON ? resume.tailoredResumeJSON : resume.baseResumeJSON;

    let content;
    let filename;
    let contentType;

    switch (format?.toLowerCase()) {
      case 'html':
        content = renderHtmlTemplate(resumeJSON, resume.template);
        filename = `resume-${id}.html`;
        contentType = 'text/html';
        break;
      case 'markdown':
        content = renderToMarkdown(resumeJSON);
        filename = `resume-${id}.md`;
        contentType = 'text/markdown';
        break;
      case 'txt':
        content = renderToText(resumeJSON);
        filename = `resume-${id}.txt`;
        contentType = 'text/plain';
        break;
      case 'pdf':
        // For PDF, we'd need proper PDF generation
        // For now, return HTML that can be printed to PDF
        content = renderHtmlTemplate(resumeJSON, resume.template);
        filename = `resume-${id}.html`;
        contentType = 'text/html';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid format. Use: html, markdown, txt, or pdf' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// RENDER HTML TEMPLATE
// ============================================================

function renderHtmlTemplate(resumeJSON, template) {
  // This integrates with the resumeRenderer
  const baseTemplate = template || 'modern';
  return renderToHtml(resumeJSON, baseTemplate);
}