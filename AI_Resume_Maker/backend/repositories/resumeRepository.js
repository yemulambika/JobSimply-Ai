import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// RESUME REPOSITORY V2 - PostgreSQL JSONB Operations
// Source of Truth: Resume JSON
// ============================================================

/**
 * Create a new resume with base JSON
 */
async function createResume({ userId, title, fileUrl, originalFilename, baseResumeJSON, template = 'modern' }) {
  return await prisma.resume.create({
    data: {
      userId,
      title,
      fileUrl,
      originalFilename,
      baseResumeJSON,
      template,
      status: 'draft',
    },
  });
}

/**
 * Get resume by ID with full JSON
 */
async function getResumeById(id, userId) {
  return await prisma.resume.findFirst({
    where: { id, userId },
  });
}

/**
 * Get all resumes for user
 */
async function getUserResumes(userId) {
  return await prisma.resume.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      template: true,
      status: true,
      fileUrl: true,
      extractionConfidence: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Get active resume for user
 */
async function getActiveResume(userId) {
  return await prisma.resume.findFirst({
    where: { userId, status: 'active' },
  });
}

/**
 * Update resume JSON (draft updates)
 */
async function updateResumeJSON(id, userId, resumeJSON) {
  return await prisma.resume.update({
    where: { id, userId },
    data: {
      baseResumeJSON: resumeJSON,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update tailored resume JSON
 */
async function updateTailoredResumeJSON(id, userId, tailoredResumeJSON) {
  return await prisma.resume.update({
    where: { id, userId },
    data: {
      tailoredResumeJSON,
      updatedAt: new Date(),
    },
  });
}

/**
 * Create tailored resume version
 */
async function createTailoredResume({ userId, resumeId, jobId, title, jobDescription, content, atsScore, matchScore }) {
  return await prisma.tailoredResume.create({
    data: {
      userId,
      resumeId,
      jobId,
      title,
      jobDescription,
      content,
      atsScore,
      matchScore,
    },
  });
}

/**
 * Get tailored resume by ID
 */
async function getTailoredResumeById(id, userId) {
  return await prisma.tailoredResume.findFirst({
    where: { id, userId },
  });
}

/**
 * Get all tailored versions for a resume
 */
async function getTailoredVersions(resumeId, userId) {
  return await prisma.tailoredResume.findMany({
    where: { resumeId, userId },
    orderBy: { createdAt: 'desc' },
  });
  }

/**
 * Save resume version for history
 */
async function saveResumeVersion(resumeId, content, changeNote = 'Auto-saved version') {
  // Get current version number
  const versions = await prisma.resumeVersion.findMany({
    where: { resumeId },
    orderBy: { version: 'desc' },
    take: 1,
  });
  
  const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
  
  return await prisma.resumeVersion.create({
    data: {
      resumeId,
      version: nextVersion,
      content,
      changeNote,
    },
  });
}

/**
 * Get resume version history
 */
async function getResumeVersions(resumeId, userId) {
  // Verify ownership
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
  });
  
  if (!resume) return [];
  
  return await prisma.resumeVersion.findMany({
    where: { resumeId },
    orderBy: { version: 'desc' },
  });
}

/**
 * Restore resume to specific version
 */
async function restoreResumeVersion(resumeId, userId, version) {
  const versionRecord = await prisma.resumeVersion.findFirst({
    where: { resumeId, version },
  });
  
  if (!versionRecord) {
    throw new Error('Version not found');
  }
  
  return await prisma.resume.update({
    where: { id: resumeId, userId },
    data: {
      baseResumeJSON: versionRecord.content,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete resume
 */
async function deleteResume(id, userId) {
  return await prisma.resume.deleteMany({
    where: { id, userId },
  });
}

/**
 * Update resume template
 */
async function updateResumeTemplate(id, userId, template) {
  return await prisma.resume.update({
    where: { id, userId },
    data: { template },
  });
}

/**
 * Update resume status
 */
async function updateResumeStatus(id, userId, status) {
  return await prisma.resume.update({
    where: { id, userId },
    data: { status },
  });
}

/**
 * Get resume for export (with file URL)
 */
async function getResumeForExport(id, userId) {
  return await prisma.resume.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      baseResumeJSON: true,
      tailoredResumeJSON: true,
      template: true,
    },
  });
}

// Export functions
export {
  createResume,
  getResumeById,
  getUserResumes,
  getActiveResume,
  updateResumeJSON,
  updateTailoredResumeJSON,
  createTailoredResume,
  getTailoredResumeById,
  getTailoredVersions,
  saveResumeVersion,
  getResumeVersions,
  restoreResumeVersion,
  deleteResume,
  updateResumeTemplate,
  updateResumeStatus,
  getResumeForExport,
};
