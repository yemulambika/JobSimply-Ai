/**
 * Resume Tailoring Service - Edits only structured JSON, never PDF
 * Preserves factual accuracy - never invents experience or skills
 * Uses semantic analysis to suggest improvements based on job requirements
 */

import SemanticATSEngine from './SemanticATSEngine.js';

class ResumeTailoringService {
  constructor() {
    this.atsEngine = new SemanticATSEngine();
  }

  /**
   * Tailor resume for a specific job
   * @param {object} resumeJSON - Original resume JSON
   * @param {object} jobJSON - Job description JSON
   * @param {object} options - Tailoring options
   * @returns {Promise<object>} - Tailored resume JSON with changes
   */
  async tailorResume(resumeJSON, jobJSON, options = {}) {
    console.log('[ResumeTailoringService] Starting resume tailoring');

    // Run semantic analysis first
    const analysis = await this.atsEngine.analyze(resumeJSON, jobJSON);
    console.log('[ResumeTailoringService] Analysis complete. ATS Score:', analysis.atsScore);

    // Create tailored version based on analysis
    const tailoredResume = this.createTailoredVersion(resumeJSON, jobJSON, analysis, options);

    // Track changes made
    const changes = this.trackChanges(resumeJSON, tailoredResume, analysis);

    console.log('[ResumeTailoringService] Tailoring complete. Changes:', changes.length);

    return {
      tailoredResume,
      changes,
      analysis,
      atsScore: analysis.atsScore,
      originalAtsScore: analysis.atsScore, // Will be recalculated after tailoring
    };
  }

  /**
   * Create tailored version of resume
   * Only edits existing data - never invents new experience or skills
   */
  createTailoredVersion(resumeJSON, jobJSON, analysis, options) {
    const tailored = JSON.parse(JSON.stringify(resumeJSON)); // Deep copy

    // Tailor summary based on job requirements
    if (options.tailorSummary !== false) {
      tailored.summary = this.tailorSummary(resumeJSON.summary, jobJSON, analysis);
    }

    // Reorder skills to prioritize matched skills
    if (options.reorderSkills !== false) {
      tailored.skills = this.reorderSkills(resumeJSON.skills, analysis.details.matchedSkills);
    }

    // Reorder experience to prioritize relevant roles
    if (options.reorderExperience !== false) {
      tailored.experience = this.reorderExperience(resumeJSON.experience, jobJSON, analysis);
    }

    // Reorder projects to prioritize relevant projects
    if (options.reorderProjects !== false) {
      tailored.projects = this.reorderProjects(resumeJSON.projects, analysis.details.matchedProjects);
    }

    // Add missing keywords to summary if they exist in resume
    if (options.addKeywords !== false) {
      tailored.summary = this.addMissingKeywords(tailored.summary, analysis.details.missingSkills, resumeJSON);
    }

    return tailored;
  }

  /**
   * Tailor summary to include job-relevant keywords
   * Never invents new skills - only uses existing resume content
   */
  tailorSummary(originalSummary, jobJSON, analysis) {
    if (!originalSummary) return originalSummary;

    const jobKeywords = this.extractJobKeywords(jobJSON);
    const matchedSkills = analysis.details.matchedSkills.map(m => m.skill);
    const missingSkills = analysis.details.missingSkills;

    // Check if summary already contains job-relevant terms
    const summaryLower = originalSummary.toLowerCase();
    const hasKeywords = jobKeywords.some(kw => summaryLower.includes(kw.toLowerCase()));

    if (hasKeywords) {
      return originalSummary; // Summary already has good keywords
    }

    // Suggest adding matched skills to summary (if they're not already there)
    const skillsToAdd = matchedSkills.filter(skill => 
      !summaryLower.includes(skill.toLowerCase())
    ).slice(0, 3); // Limit to top 3

    if (skillsToAdd.length === 0) {
      return originalSummary;
    }

    // Prepend skills to summary (conservative approach)
    const skillsPhrase = skillsToAdd.length > 1
      ? `Experienced in ${skillsToAdd.slice(0, -1).join(', ')} and ${skillsToAdd[skillsToAdd.length - 1]}. `
      : `Experienced in ${skillsToAdd[0]}. `;

    return skillsPhrase + originalSummary;
  }

  /**
   * Reorder skills to prioritize matched skills
   */
  reorderSkills(originalSkills, matchedSkills) {
    const skills = JSON.parse(JSON.stringify(originalSkills));
    const matchedSkillNames = matchedSkills.map(m => m.skill.toLowerCase());

    // Reorder each category
    for (const [category, skillList] of Object.entries(skills)) {
      if (Array.isArray(skillList)) {
        skills[category] = skillList.sort((a, b) => {
          const aName = (typeof a === 'string' ? a : a.name || a).toLowerCase();
          const bName = (typeof b === 'string' ? b : b.name || b).toLowerCase();
          const aMatched = matchedSkillNames.some(m => aName.includes(m) || m.includes(aName));
          const bMatched = matchedSkillNames.some(m => bName.includes(m) || m.includes(bName));

          if (aMatched && !bMatched) return -1;
          if (!aMatched && bMatched) return 1;
          return 0;
        });
      }
    }

    return skills;
  }

  /**
   * Reorder experience to prioritize relevant roles
   */
  reorderExperience(originalExperience, jobJSON, analysis) {
    const experience = JSON.parse(JSON.stringify(originalExperience));
    const jobTitle = (jobJSON.title || '').toLowerCase();
    const jobDescription = (jobJSON.description || '').toLowerCase();

    return experience.sort((a, b) => {
      const aTitle = (a.designation || a.title || '').toLowerCase();
      const bTitle = (b.designation || b.title || '').toLowerCase();
      const aDesc = (a.description || '').toLowerCase();
      const bDesc = (b.description || '').toLowerCase();

      // Score relevance for each experience
      let aScore = 0;
      let bScore = 0;

      // Check title match
      if (aTitle.includes(jobTitle) || jobTitle.includes(aTitle)) aScore += 3;
      if (bTitle.includes(jobTitle) || jobTitle.includes(bTitle)) bScore += 3;

      // Check description keyword match
      const jobKeywords = this.extractJobKeywords(jobJSON);
      for (const kw of jobKeywords) {
        if (aDesc.includes(kw.toLowerCase())) aScore += 1;
        if (bDesc.includes(kw.toLowerCase())) bScore += 1;
      }

      // Check technology match
      const aTechs = (a.technologies || []).map(t => t.toLowerCase());
      const bTechs = (b.technologies || []).map(t => t.toLowerCase());
      for (const kw of jobKeywords) {
        if (aTechs.some(t => t.includes(kw.toLowerCase()) || kw.toLowerCase().includes(t))) aScore += 1;
        if (bTechs.some(t => t.includes(kw.toLowerCase()) || kw.toLowerCase().includes(t))) bScore += 1;
      }

      // Current experience gets bonus
      if (a.current) aScore += 1;
      if (b.current) bScore += 1;

      return bScore - aScore;
    });
  }

  /**
   * Reorder projects to prioritize relevant projects
   */
  reorderProjects(originalProjects, matchedProjects) {
    const projects = JSON.parse(JSON.stringify(originalProjects));
    const matchedProjectTitles = matchedProjects.map(p => p.title).filter(Boolean);

    return projects.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();

      const aMatched = matchedProjectTitles.some(mt => 
        aTitle.includes(mt.toLowerCase()) || mt.toLowerCase().includes(aTitle)
      );
      const bMatched = matchedProjectTitles.some(mt => 
        bTitle.includes(mt.toLowerCase()) || mt.toLowerCase().includes(bTitle)
      );

      if (aMatched && !bMatched) return -1;
      if (!aMatched && bMatched) return 1;
      return 0;
    });
  }

  /**
   * Add missing keywords if they exist elsewhere in resume
   * Never invents new skills - only highlights existing ones
   */
  addMissingKeywords(summary, missingSkills, resumeJSON) {
    if (!summary || !missingSkills || missingSkills.length === 0) {
      return summary;
    }

    // Check if missing skills exist anywhere in resume
    const resumeText = JSON.stringify(resumeJSON).toLowerCase();
    const existingMissingSkills = missingSkills.filter(skill => 
      resumeText.includes(skill.toLowerCase())
    );

    if (existingMissingSkills.length === 0) {
      return summary; // No existing skills to highlight
    }

    // Add note about skills (conservative - don't modify summary directly)
    const summaryLower = summary.toLowerCase();
    const skillsToAdd = existingMissingSkills.filter(skill => 
      !summaryLower.includes(skill.toLowerCase())
    ).slice(0, 2);

    if (skillsToAdd.length === 0) {
      return summary;
    }

    return summary;
  }

  /**
   * Track changes made during tailoring
   */
  trackChanges(original, tailored, analysis) {
    const changes = [];

    // Check summary changes
    if (original.summary !== tailored.summary) {
      changes.push({
        section: 'summary',
        type: 'modified',
        original: original.summary,
        tailored: tailored.summary,
        reason: 'Added job-relevant keywords from existing skills',
      });
    }

    // Check skills reordering
    if (JSON.stringify(original.skills) !== JSON.stringify(tailored.skills)) {
      changes.push({
        section: 'skills',
        type: 'reordered',
        reason: 'Prioritized skills that match job requirements',
      });
    }

    // Check experience reordering
    if (JSON.stringify(original.experience) !== JSON.stringify(tailored.experience)) {
      changes.push({
        section: 'experience',
        type: 'reordered',
        reason: 'Prioritized relevant work experience',
      });
    }

    // Check projects reordering
    if (JSON.stringify(original.projects) !== JSON.stringify(tailored.projects)) {
      changes.push({
        section: 'projects',
        type: 'reordered',
        reason: 'Prioritized relevant projects',
      });
    }

    return changes;
  }

  /**
   * Extract keywords from job description
   */
  extractJobKeywords(jobJSON) {
    const keywords = [
      ...(jobJSON.requiredSkills || []),
      ...(jobJSON.preferredSkills || []),
      ...(jobJSON.keywords || []),
    ];

    // Extract from description
    const description = jobJSON.description || '';
    const techKeywords = description.match(/\b(javascript|typescript|react|vue|angular|node|python|java|aws|docker|kubernetes|sql|mongodb|postgresql|redis|graphql|rest|api)\b/gi) || [];
    keywords.push(...techKeywords);

    return [...new Set(keywords.map(k => k.toLowerCase()))];
  }

  /**
   * Validate that tailoring preserves factual accuracy
   * Ensures no new experience or skills were invented
   */
  validateTailoring(original, tailored) {
    const errors = [];

    // Check that no new experience entries were added
    if (tailored.experience.length > original.experience.length) {
      errors.push('New experience entries were added - this violates factual accuracy');
    }

    // Check that no new skills were added
    const originalSkills = this.extractAllSkills(original);
    const tailoredSkills = this.extractAllSkills(tailored);
    const newSkills = tailoredSkills.filter(s => !originalSkills.includes(s));
    if (newSkills.length > 0) {
      errors.push(`New skills were invented: ${newSkills.join(', ')}`);
    }

    // Check that no new projects were added
    if (tailored.projects.length > original.projects.length) {
      errors.push('New project entries were added - this violates factual accuracy');
    }

    // Check that no new education entries were added
    if (tailored.education.length > original.education.length) {
      errors.push('New education entries were added - this violates factual accuracy');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract all skills from resume as flat array
   */
  extractAllSkills(resumeJSON) {
    const skills = [];
    const skillsObj = resumeJSON.skills || {};
    for (const arr of Object.values(skillsObj)) {
      if (Array.isArray(arr)) {
        skills.push(...arr.map(s => typeof s === 'string' ? s.toLowerCase() : (s.name || s).toLowerCase()));
      }
    }
    return [...new Set(skills)];
  }
}

export default ResumeTailoringService;
