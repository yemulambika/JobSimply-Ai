/**
 * ATS Scoring Engine - Main orchestrator for resume-job matching
 * Uses weighted scoring with semantic matching and detailed explanations
 */

import { isSemanticallyRelated, normalizeSkills } from './SkillNormalizer.js';
import { AtsResumeParser } from './AtsResumeParser.js';
import { JobDescriptionParser } from './JobDescriptionParser.js';
import { ExperienceMatcher } from './ExperienceMatcher.js';
import { ProjectMatcher } from './ProjectMatcher.js';
import { EducationMatcher } from './EducationMatcher.js';
import { ResponsibilityMatcher } from './ResponsibilityMatcher.js';

// Weight distribution
const WEIGHTS = {
  skills: 35,
  experience: 25,
  projects: 15,
  education: 10,
  responsibilities: 10,
  keywords: 5,
};

export class ATSScoringEngine {
  constructor() {
    this.resumeParser = new AtsResumeParser();
    this.jobParser = new JobDescriptionParser();
    this.experienceMatcher = new ExperienceMatcher();
    this.projectMatcher = new ProjectMatcher();
    this.educationMatcher = new EducationMatcher();
    this.responsibilityMatcher = new ResponsibilityMatcher();
  }
  
  /**
   * Analyze resume against job description
   */
  analyze(resumeText, job) {
    // Parse both documents
    const parsedResume = this.resumeParser.parse(resumeText);
    const parsedJob = this.jobParser.parse(job);
    
    // Also extract skills from raw resume text for better matching (handles resumes without SKILLS section)
    const rawSkills = this.extractSkillsFromText(resumeText);
    parsedResume.skills = this.mergeSkills(parsedResume.skills, rawSkills);
    
    // Run all matchers
    const skillsResult = this.matchSkills(parsedResume.skills, parsedJob.requiredSkills, parsedJob.preferredSkills);
    const experienceResult = this.experienceMatcher.match(parsedResume.experience, parsedJob.requiredExperience);
    const projectResult = this.projectMatcher.match(parsedResume.projects, parsedJob);
    const educationResult = this.educationMatcher.match(parsedResume.education, parsedJob.requiredEducation);
    const responsibilityResult = this.responsibilityMatcher.match(parsedResume.experience, parsedJob.responsibilities);
    
    // Calculate weighted final score
    const atsScore = Math.round(
      (skillsResult.score * WEIGHTS.skills +
       experienceResult.score * WEIGHTS.experience +
       projectResult.score * WEIGHTS.projects +
       educationResult.score * WEIGHTS.education +
       responsibilityResult.score * WEIGHTS.responsibilities +
       this.calculateKeywordMatch(parsedResume, parsedJob) * WEIGHTS.keywords) / 100
    );
    
    // Generate detailed explanations for each section
    const scores = {
      skills: this.explainSkillsScore(skillsResult, parsedJob),
      experience: this.explainExperienceScore(experienceResult, parsedJob),
      projects: this.explainProjectScore(projectResult, parsedJob),
      education: this.explainEducationScore(educationResult, parsedJob),
      responsibilities: this.explainResponsibilityScore(responsibilityResult, parsedJob),
      keywords: this.explainKeywordScore(this.calculateKeywordMatch(parsedResume, parsedJob), parsedResume, parsedJob),
    };
    
    return {
      atsScore,
      scores,
      details: {
        totalYears: experienceResult.totalYears,
        experienceGap: experienceResult.gap,
        matchedSkills: skillsResult.matched,
        missingSkills: skillsResult.missing,
        matchedProjects: projectResult.matchedProjects,
        missingTechnologies: projectResult.missingTechnologies,
        educationRelevant: educationResult.relevant,
        matchedResponsibilities: responsibilityResult.matched || [],
        missingResponsibilities: responsibilityResult.unmatched || [],
      },
      parsedResume,
      parsedJob,
    };
  }
  
  /**
   * Extract skills from raw resume text (fallback for resumes without SKILLS section)
   */
  extractSkillsFromText(text) {
    const skillKeywords = [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'node.js',
      'python', 'java', 'aws', 'docker', 'sql', 'mongodb', 'postgresql', 'mysql',
      'express', 'django', 'flask', 'spring', 'html', 'css', 'nextjs', 'redux',
      'backend', 'frontend', 'full stack', 'fullstack', 'software development'
    ];
    const found = [];
    const lowerText = text.toLowerCase();
    for (const skill of skillKeywords) {
      if (lowerText.includes(skill)) {
        found.push(skill);
      }
    }
    return { languages: [], frontend: [], backend: [], databases: [], cloud: [], devops: [], ai_ml: [], tools: [], other: found };
  }
  
  /**
   * Merge skills from parsed data and extracted skills
   */
  mergeSkills(parsedSkills, extractedSkills) {
    const result = { ...parsedSkills };
    for (const category of Object.keys(extractedSkills)) {
      if (Array.isArray(extractedSkills[category])) {
        if (!Array.isArray(result[category])) {
          result[category] = [];
        }
        for (const skill of extractedSkills[category]) {
          if (!result[category].includes(skill)) {
            result[category] = [...result[category], skill];
          }
        }
      }
    }
    return result;
  }
  
  /**
   * Match skills using semantic matching
   */
  matchSkills(candidateSkills, requiredSkills, preferredSkills) {
    // Flatten candidate skills from all categories
    const candidateSkillsFlat = this.flattenSkills(candidateSkills);
    
    // Normalize required and preferred skills
    const normalizedRequired = normalizeSkills(requiredSkills || []);
    const normalizedPreferred = normalizeSkills(preferredSkills || []);
    const allJobSkills = [...normalizedRequired, ...normalizedPreferred];
    
    // Use semantic matching to find matches
    const matched = [];
    const missing = [];
    
    for (const jobSkill of allJobSkills) {
      const isMatched = this.isSkillMatched(jobSkill, candidateSkillsFlat);
      if (isMatched) {
        matched.push(jobSkill);
      } else {
        missing.push(jobSkill);
      }
    }
    
    // If job has skills, calculate score, otherwise give full score
    const score = allJobSkills.length > 0
      ? Math.round((matched.length / allJobSkills.length) * 100)
      : 100;
    
    return { score, matched: [...new Set(matched)], missing: [...new Set(missing)] };
  }
  
  flattenSkills(skills) {
    if (!skills) return [];
    const flat = [];
    for (const category of Object.values(skills)) {
      if (Array.isArray(category)) {
        flat.push(...category.map(s => s.toLowerCase()));
      }
    }
    return [...new Set(flat)];
  }
  
  /**
   * Check if skill is matched using semantic matching
   */
  isSkillMatched(jobSkill, candidateSkills) {
    const lowerJobSkill = jobSkill.toLowerCase();
    const lowerCandidateSkills = candidateSkills.map(s => s.toLowerCase());
    
    // Direct semantic match
    for (const candidateSkill of lowerCandidateSkills) {
      if (lowerJobSkill.includes(candidateSkill) || candidateSkill.includes(lowerJobSkill)) {
        return true;
      }
      
      // Category-based matching
      if (isSemanticallyRelated(candidateSkill, [lowerJobSkill])) {
        return true;
      }
      if (isSemanticallyRelated(lowerJobSkill, [candidateSkill])) {
        return true;
      }
    }
    
    // Check if job skill category is covered by candidate skills
    const jobSkillCategory = this.getSkillCategory(lowerJobSkill);
    if (jobSkillCategory) {
      for (const candidateSkill of lowerCandidateSkills) {
        const candidateCategory = this.getSkillCategory(candidateSkill);
        if (candidateCategory && candidateCategory === jobSkillCategory) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  getSkillCategory(skill) {
    const categories = {
      'software development': ['software development', 'software engineering', 'application development', 'developer', 'full stack', 'fullstack', 'frontend', 'backend', 'web development', 'web developer', 'software engineer', 'application engineer', 'programming', 'coding', 'development'],
      'backend': ['nodejs', 'node.js', 'node', 'express', 'backend', 'server', 'api', 'rest api', 'restful', 'graphql', 'microservices'],
      'frontend': ['react', 'vue', 'angular', 'html', 'css', 'frontend', 'ui', 'ux'],
      'languages': ['javascript', 'typescript', 'python', 'java', 'c#', 'php', 'go', 'rust', 'sql'],
      'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'database', 'nosql'],
      'devops': ['docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'gcp', 'devops'],
    };
    
    for (const [category, skills] of Object.entries(categories)) {
      if (skills.some(s => skill.includes(s) || s.includes(skill))) {
        return category;
      }
    }
    return null;
  }
  
  /**
   * Calculate keyword match score with semantic matching
   */
  calculateKeywordMatch(parsedResume, parsedJob) {
    const resumeText = JSON.stringify(parsedResume).toLowerCase();
    const jobKeywords = parsedJob.keywords || [];
    const jobSkills = [...(parsedJob.requiredSkills || []), ...(parsedJob.preferredSkills || [])];
    const jobTechnologies = parsedJob.technologies || [];
    
    // Combine all job terms
    const allJobTerms = [...jobKeywords, ...jobSkills, ...jobTechnologies];
    
    if (allJobTerms.length === 0) return 100;
    
    const matchedKeywords = [];
    const unmatchedKeywords = [];
    
    for (const keyword of allJobTerms) {
      if (this.isKeywordMatched(keyword, resumeText)) {
        matchedKeywords.push(keyword);
      } else {
        unmatchedKeywords.push(keyword);
      }
    }
    
    return matchedKeywords.length > 0
      ? Math.round((matchedKeywords.length / allJobTerms.length) * 100)
      : 50; // Base score if no keywords found
  }
  
  isKeywordMatched(keyword, resumeText) {
    const lowerKeyword = keyword.toLowerCase();
    
    // Direct match
    if (resumeText.includes(lowerKeyword)) {
      return true;
    }
    
    // Semantic matching for skills
    if (lowerKeyword.includes('software') || lowerKeyword.includes('developer') || lowerKeyword.includes('engineer')) {
      if (resumeText.includes('software') || resumeText.includes('developer') || resumeText.includes('engineer') || 
          resumeText.includes('programming') || resumeText.includes('coding')) {
        return true;
      }
    }
    
    if (lowerKeyword.includes('programming') || lowerKeyword.includes('coding')) {
      const langs = ['javascript', 'typescript', 'python', 'java', 'php', 'go', 'ruby', 'c++', 'c#'];
      if (langs.some(lang => resumeText.includes(lang))) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate explanation for skills score
   */
  explainSkillsScore(result, parsedJob) {
    const score = result.score;
    const matched = result.matched;
    const missing = result.missing;
    const reason = [];
    
    if (matched.length > 0) {
      reason.push(`Matched ${matched.length} skills from job requirements: ${matched.slice(0, 5).join(', ')}${matched.length > 5 ? '...' : ''}`);
    }
    
    if (missing.length > 0) {
      reason.push(`Missing skills that could improve match: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }
    
    return { score, reason: reason.join('. ') };
  }
  
  /**
   * Generate explanation for experience score
   */
  explainExperienceScore(result, parsedJob) {
    const score = result.score;
    const reasons = [];
    
    if (score >= 80) {
      reasons.push(`Strong experience match (${result.totalYears} years total experience)`);
    } else if (score >= 60) {
      reasons.push(`Good experience level (${result.totalYears} years total experience)`);
    } else if (score >= 40) {
      reasons.push(`Some relevant experience (${result.totalYears} years total experience)`);
    } else {
      reasons.push(`Limited experience (${result.totalYears} years total experience)`);
    }
    
    if (result.gap > 0) {
      reasons.push(`Gap of ${result.gap} years to meet minimum requirements`);
    }
    
    return { score, reason: reasons.join('. ') };
  }
  
  /**
   * Generate explanation for project score
   */
  explainProjectScore(result, parsedJob) {
    const score = result.score;
    const reasons = [];
    
    if (result.matchedProjects && result.matchedProjects.length > 0) {
      reasons.push(`${result.matchedProjects.length} relevant projects found`);
    }
    
    if (score >= 80) {
      reasons.push('Projects strongly align with job requirements');
    } else if (score >= 60) {
      reasons.push('Projects show relevant technical skills');
    } else if (score >= 40) {
      reasons.push('Some project relevance to job requirements');
    }
    
    return { score, reason: reasons.join('. ') };
  }
  
  /**
   * Generate explanation for education score
   */
  explainEducationScore(result, parsedJob) {
    const score = result.score;
    const reasons = [];
    
    if (score >= 80) {
      reasons.push('Education meets or exceeds job requirements');
    } else if (score >= 60) {
      reasons.push('Education is relevant for the position');
    } else if (score >= 40) {
      reasons.push('Some education background present');
    } else {
      reasons.push('No education information found');
    }
    
    if (result.relevant) {
      reasons.push('Has relevant technical field');
    }
    
    return { score, reason: reasons.join('. ') };
  }
  
  /**
   * Generate explanation for responsibility score
   */
  explainResponsibilityScore(result, parsedJob) {
    const score = result.score;
    const reasons = [];
    
    if (result.matched && result.matched.length > 0) {
      reasons.push(`${result.matched.length} responsibilities match candidate experience`);
    }
    
    if (result.unmatched && result.unmatched.length > 0) {
      reasons.push(`${result.unmatched.length} responsibilities not demonstrated`);
    }
    
    if (score >= 80) {
      reasons.push('Responsibilities strongly align with job requirements');
    } else if (score >= 60) {
      reasons.push('Most responsibilities match experience');
    } else if (score >= 40) {
      reasons.push('Some responsibility overlap with job requirements');
    }
    
    if (!result.explanation && reasons.length === 0) {
      reasons.push('No specific responsibilities identified');
    }
    
    return { score, reason: reasons.join('. ') };
  }
  
  /**
   * Generate explanation for keyword score
   */
  explainKeywordScore(score, parsedResume, parsedJob) {
    const reasons = [];
    
    if (score >= 80) {
      reasons.push('Strong keyword presence in resume');
    } else if (score >= 60) {
      reasons.push('Good keyword coverage');
    } else if (score >= 40) {
      reasons.push('Some keywords present, room for improvement');
    } else {
      reasons.push('Limited keyword match');
    }
    
    return { score, reason: reasons.join('. ') };
  }
}