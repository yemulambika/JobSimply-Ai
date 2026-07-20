import { extractResume as geminiExtract } from './geminiProvider.js';
import { extractResume as openrouterExtract } from './openrouterProvider.js';
import { extractResume as groqExtract } from './groqProvider.js';
import { extractResume as regexExtract } from './regexProvider.js';
import { normalizeResumeData } from './normalizeResumeData.js';

/**
 * AI Provider Orchestrator
 * Implements fallback logic for resume extraction across multiple providers.
 * Normalizes all provider outputs to consistent structure.
 */
export async function extractResume(resumeText) {
  const providers = [
    { name: 'Gemini', fn: geminiExtract },
    { name: 'OpenRouter', fn: openrouterExtract },
    { name: 'Groq', fn: groqExtract },
    { name: 'Regex Parser', fn: regexExtract },
  ];

  for (const provider of providers) {
    try {
      console.log(`Using ${provider.name}...`);
      const result = await provider.fn(resumeText);
      
      if (result) {
        console.log(`${provider.name} succeeded. Normalizing output...`);
        const normalized = normalizeResumeData(result);
        console.log(`${provider.name} normalized structure:`, {
          hasPersonalInfo: !!normalized.personalInfo,
          hasSummary: !!normalized.summary,
          hasSkills: !!normalized.skills,
          educationCount: normalized.education?.length || 0,
          experienceCount: normalized.experience?.length || 0,
          projectsCount: normalized.projects?.length || 0,
          certificationsCount: normalized.certifications?.length || 0,
          achievementsCount: normalized.achievements?.length || 0,
          languagesCount: normalized.languages?.length || 0,
          linksCount: Object.keys(normalized.links || {}).length > 0,
          customSectionsCount: normalized.customSections?.length || 0,
        });
        return normalized;
      }
    } catch (error) {
      console.error(`${provider.name} failed.`);
      
      // Log specific reasons for failures if they are API errors
      if (error.response) {
        console.error(`${provider.name} API Error:`, error.response.status, error.response.data);
      } else {
        console.error(`${provider.name} Error:`, error.message);
      }
      
      // Continue to the next provider in the array
    }
  }

  // If all providers fail
  console.error('All AI providers failed.');
  throw new Error('AI providers unavailable');
}