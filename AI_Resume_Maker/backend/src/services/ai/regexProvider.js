/**
 * Regex Provider for Resume Extraction
 * Uses ResumeParserService for complete structured extraction
 */

import { resumeParserService } from '../../../services/ResumeParserService.js';

export async function extractResume(resumeText) {
  console.log('Using Regex Parser (ResumeParserService)...');

  if (!resumeText) {
    return resumeParserService.parseResumeText('');
  }

  // Use the complete ResumeParserService for structured extraction
  const parsed = resumeParserService.parseResumeText(resumeText);

  console.log('Regex Parser extracted sections:', {
    hasPersonalInfo: !!parsed.personalInfo,
    hasSummary: !!parsed.summary,
    hasSkills: Object.keys(parsed.skills || {}).length > 0,
    educationCount: parsed.education?.length || 0,
    experienceCount: parsed.experience?.length || 0,
    projectsCount: parsed.projects?.length || 0,
    certificationsCount: parsed.certifications?.length || 0,
    linksCount: Object.keys(parsed.links || {}).length > 0,
    customSectionsCount: parsed.customSections?.length || 0,
  });

  return parsed;
}