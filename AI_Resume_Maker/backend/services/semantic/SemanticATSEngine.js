/**
 * Semantic ATS Engine - Main orchestrator for semantic resume-job matching
 * Uses sentence-transformer embeddings and cosine similarity
 * Modular design: embedding models, scoring weights, and recommendation logic are independent
 */

import { getEmbeddingService } from './EmbeddingService.js';
import { getSimilarityService } from './SimilarityService.js';

// Configurable scoring weights - can be adjusted independently
const DEFAULT_WEIGHTS = {
  skills: 35,
  experience: 25,
  projects: 15,
  education: 10,
  responsibilities: 10,
  keywords: 5,
};

// Similarity thresholds - can be adjusted independently
const THRESHOLDS = {
  high: 0.8,
  medium: 0.6,
  low: 0.4,
};

class SemanticATSEngine {
  constructor(weights = DEFAULT_WEIGHTS) {
    this.weights = weights;
    this.embeddingService = getEmbeddingService();
    this.similarityService = getSimilarityService();
  }

  /**
   * Analyze resume against job description using semantic similarity
   * @param {object} resumeJSON - Parsed resume JSON
   * @param {object} jobJSON - Parsed job JSON
   * @returns {Promise<object>} - Analysis results with scores and explanations
   */
  async analyze(resumeJSON, jobJSON) {
    console.log('[SemanticATSEngine] Starting semantic analysis');

    // Initialize embedding service if needed
    if (!this.embeddingService.isReady()) {
      await this.embeddingService.initialize();
    }

    // Generate embeddings for resume sections
    const resumeEmbeddings = await this.embeddingService.embedResume(resumeJSON);
    console.log('[SemanticATSEngine] Resume embeddings generated');

    // Generate embeddings for job sections
    const jobEmbeddings = await this.embeddingService.embedJob(jobJSON);
    console.log('[SemanticATSEngine] Job embeddings generated');

    // Compute semantic similarities for each section
    const skillsResult = await this.matchSkillsSemantic(resumeJSON, jobJSON, resumeEmbeddings.skills, jobEmbeddings.skills);
    const experienceResult = await this.matchExperienceSemantic(resumeJSON, jobJSON, resumeEmbeddings.experience, jobEmbeddings.description);
    const projectsResult = await this.matchProjectsSemantic(resumeJSON, jobJSON, resumeEmbeddings.projects, jobEmbeddings.description);
    const educationResult = await this.matchEducationSemantic(resumeJSON, jobJSON, resumeEmbeddings.education, jobEmbeddings.description);
    const responsibilityResult = await this.matchResponsibilitiesSemantic(resumeJSON, jobJSON, resumeEmbeddings.experience, jobEmbeddings.responsibilities);
    const keywordResult = await this.matchKeywordsSemantic(resumeJSON, jobJSON, resumeEmbeddings.summary, jobEmbeddings.description);

    // Calculate weighted final score with transparent attribution
    const atsScore = this.calculateWeightedScore({
      skills: skillsResult.score,
      experience: experienceResult.score,
      projects: projectsResult.score,
      education: educationResult.score,
      responsibilities: responsibilityResult.score,
      keywords: keywordResult.score,
    });

    // Generate detailed explanations for each section
    const scores = {
      skills: this.explainSkillsScore(skillsResult, jobJSON, this.weights.skills),
      experience: this.explainExperienceScore(experienceResult, jobJSON, this.weights.experience),
      projects: this.explainProjectScore(projectsResult, jobJSON, this.weights.projects),
      education: this.explainEducationScore(educationResult, jobJSON, this.weights.education),
      responsibilities: this.explainResponsibilityScore(responsibilityResult, jobJSON, this.weights.responsibilities),
      keywords: this.explainKeywordScore(keywordResult, jobJSON, this.weights.keywords),
    };

    // Generate gap analysis
    const gapAnalysis = this.generateGapAnalysis(skillsResult, experienceResult, projectsResult, jobJSON);

    console.log('[SemanticATSEngine] Analysis complete. ATS Score:', atsScore);

    return {
      atsScore,
      scores,
      details: {
        totalYears: experienceResult.totalYears,
        experienceGap: experienceResult.gap,
        matchedSkills: skillsResult.matched,
        missingSkills: skillsResult.missing,
        recommendedSkills: skillsResult.recommended,
        matchedProjects: projectsResult.matchedProjects,
        missingTechnologies: projectsResult.missingTechnologies,
        educationRelevant: educationResult.relevant,
        matchedResponsibilities: responsibilityResult.matched,
        missingResponsibilities: responsibilityResult.unmatched,
      },
      gapAnalysis,
      resumeEmbeddings,
      jobEmbeddings,
      weights: this.weights,
    };
  }

  /**
   * Match skills using semantic similarity
   */
  async matchSkillsSemantic(resumeJSON, jobJSON, resumeEmbedding, jobEmbedding) {
    const resumeSkills = this.extractSkills(resumeJSON);
    const jobSkills = this.extractJobSkills(jobJSON);

    if (!resumeEmbedding || !jobEmbedding || resumeSkills.length === 0 || jobSkills.length === 0) {
      return this.fallbackSkillMatch(resumeSkills, jobSkills);
    }

    // Generate embeddings for individual skills
    const resumeSkillEmbeddings = await this.embeddingService.embedBatch(resumeSkills);
    const jobSkillEmbeddings = await this.embeddingService.embedBatch(jobSkills);

    // Find semantic matches
    const matched = [];
    const missing = [];
    const recommended = [];

    for (let i = 0; i < jobSkills.length; i++) {
      const jobSkill = jobSkills[i];
      const jobSkillEmbedding = jobSkillEmbeddings[i];

      // Find best match in resume skills
      const bestMatch = this.similarityService.findBestMatch(jobSkillEmbedding, resumeSkillEmbeddings);

      if (bestMatch.score >= THRESHOLDS.medium) {
        matched.push({
          skill: jobSkill,
          matchedWith: resumeSkills[bestMatch.index],
          similarity: bestMatch.score,
        });
      } else {
        missing.push(jobSkill);
        // Recommend similar skills from resume
        if (bestMatch.score >= THRESHOLDS.low) {
          recommended.push({
            missing: jobSkill,
            similarTo: resumeSkills[bestMatch.index],
            similarity: bestMatch.score,
          });
        }
      }
    }

    const score = jobSkills.length > 0
      ? Math.round((matched.length / jobSkills.length) * 100)
      : 100;

    return { score, matched, missing, recommended };
  }

  /**
   * Match experience using semantic similarity
   */
  async matchExperienceSemantic(resumeJSON, jobJSON, resumeEmbedding, jobEmbedding) {
    const experience = resumeJSON.experience || [];
    const totalYears = this.calculateTotalYears(experience);
    const requiredYears = this.extractRequiredYears(jobJSON);

    if (!resumeEmbedding || !jobEmbedding) {
      return this.fallbackExperienceMatch(totalYears, requiredYears);
    }

    // Compute semantic similarity between experience and job description
    const similarity = this.similarityService.computeSimilarity(resumeEmbedding, jobEmbedding);
    const gap = Math.max(0, requiredYears - totalYears);

    // Base score from years + semantic similarity
    const yearsScore = requiredYears > 0
      ? Math.min(100, (totalYears / requiredYears) * 100)
      : 100;
    const semanticScore = Math.round(similarity * 100);

    const score = Math.round((yearsScore * 0.6) + (semanticScore * 0.4));

    return { score, totalYears, gap, semanticSimilarity: semanticScore };
  }

  /**
   * Match projects using semantic similarity
   */
  async matchProjectsSemantic(resumeJSON, jobJSON, resumeEmbedding, jobEmbedding) {
    const projects = resumeJSON.projects || [];
    const jobTechnologies = this.extractJobTechnologies(jobJSON);

    if (!resumeEmbedding || !jobEmbedding || projects.length === 0) {
      return this.fallbackProjectMatch(projects, jobTechnologies);
    }

    // Compute semantic similarity between projects and job description
    const similarity = this.similarityService.computeSimilarity(resumeEmbedding, jobEmbedding);

    // Match technologies
    const projectTechnologies = this.extractProjectTechnologies(projects);
    const matchedTechnologies = this.matchTechnologies(projectTechnologies, jobTechnologies);
    const missingTechnologies = jobTechnologies.filter(t => !matchedTechnologies.includes(t));

    // Identify relevant projects based on semantic similarity
    const matchedProjects = projects.filter(proj => {
      const projTechs = proj.technologies || [];
      return projTechs.some(tech => matchedTechnologies.includes(tech));
    });

    const score = Math.round((similarity * 0.5 + (matchedTechnologies.length / Math.max(1, jobTechnologies.length)) * 50));

    return {
      score,
      matchedProjects,
      missingTechnologies,
      semanticSimilarity: Math.round(similarity * 100),
    };
  }

  /**
   * Match education using semantic similarity
   */
  async matchEducationSemantic(resumeJSON, jobJSON, resumeEmbedding, jobEmbedding) {
    const education = resumeJSON.education || [];
    const requiredEducation = jobJSON.qualifications || '';

    if (!resumeEmbedding || !jobEmbedding || education.length === 0) {
      return this.fallbackEducationMatch(education, requiredEducation);
    }

    // Compute semantic similarity between education and job requirements
    const similarity = this.similarityService.computeSimilarity(resumeEmbedding, jobEmbedding);

    // Check if education field is relevant
    const relevant = this.isEducationRelevant(education, requiredEducation);

    const score = Math.round((similarity * 0.7) + (relevant ? 30 : 0));

    return { score, relevant, semanticSimilarity: Math.round(similarity * 100) };
  }

  /**
   * Match responsibilities using semantic similarity
   */
  async matchResponsibilitiesSemantic(resumeJSON, jobJSON, resumeEmbedding, jobEmbedding) {
    const experience = resumeJSON.experience || [];
    const responsibilities = jobJSON.responsibilities || '';

    if (!resumeEmbedding || !jobEmbedding || !responsibilities) {
      return { score: 50, matched: [], unmatched: [] };
    }

    // Compute semantic similarity
    const similarity = this.similarityService.computeSimilarity(resumeEmbedding, jobEmbedding);

    // Extract responsibilities from experience
    const expResponsibilities = experience.flatMap(exp => exp.bullets || []);
    const matched = expResponsibilities.filter(resp => 
      responsibilities.toLowerCase().includes(resp.toLowerCase()) ||
      resp.toLowerCase().includes(responsibilities.toLowerCase())
    );

    const unmatched = expResponsibilities.filter(resp => !matched.includes(resp));

    const score = Math.round((similarity * 0.6) + ((matched.length / Math.max(1, expResponsibilities.length)) * 40));

    return { score, matched, unmatched, semanticSimilarity: Math.round(similarity * 100) };
  }

  /**
   * Match keywords using semantic similarity
   */
  async matchKeywordsSemantic(resumeJSON, jobJSON, resumeEmbedding, jobEmbedding) {
    if (!resumeEmbedding || !jobEmbedding) {
      return this.fallbackKeywordMatch(resumeJSON, jobJSON);
    }

    // Compute semantic similarity between summary and job description
    const similarity = this.similarityService.computeSimilarity(resumeEmbedding, jobEmbedding);

    const score = Math.round(similarity * 100);

    return { score, semanticSimilarity: score };
  }

  /**
   * Calculate weighted score with transparent attribution
   */
  calculateWeightedScore(sectionScores) {
    let total = 0;
    let totalWeight = 0;

    for (const [section, score] of Object.entries(sectionScores)) {
      const weight = this.weights[section] || 0;
      total += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(total / totalWeight) : 0;
  }

  /**
   * Generate gap analysis
   */
  generateGapAnalysis(skillsResult, experienceResult, projectsResult, jobJSON) {
    return {
      skills: {
        matched: skillsResult.matched.map(m => m.skill),
        missing: skillsResult.missing,
        recommended: skillsResult.recommended.map(r => ({
          missing: r.missing,
          considerAdding: r.similarTo,
          reason: `Similar to your existing skill (${Math.round(r.similarity * 100)}% match)`,
        })),
      },
      experience: {
        totalYears: experienceResult.totalYears,
        requiredYears: this.extractRequiredYears(jobJSON),
        gap: experienceResult.gap,
        recommendation: experienceResult.gap > 0
          ? `Consider highlighting more relevant experience or projects to compensate for ${experienceResult.gap} year gap`
          : 'Experience meets or exceeds requirements',
      },
      projects: {
        matchedCount: projectsResult.matchedProjects.length,
        missingTechnologies: projectsResult.missingTechnologies,
        recommendation: projectsResult.missingTechnologies.length > 0
          ? `Consider adding projects with: ${projectsResult.missingTechnologies.slice(0, 3).join(', ')}`
          : 'Projects align well with job requirements',
      },
    };
  }

  // Helper methods
  extractSkills(resumeJSON) {
    const skills = resumeJSON.skills || {};
    const flatSkills = [];
    for (const arr of Object.values(skills)) {
      if (Array.isArray(arr)) {
        flatSkills.push(...arr.map(s => typeof s === 'string' ? s : s.name || s));
      }
    }
    return [...new Set(flatSkills)];
  }

  extractJobSkills(jobJSON) {
    return [
      ...(jobJSON.requiredSkills || []),
      ...(jobJSON.preferredSkills || []),
    ].filter(Boolean);
  }

  extractJobTechnologies(jobJSON) {
    const text = (jobJSON.description || '').toLowerCase();
    const commonTech = ['javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'python', 'java', 'aws', 'docker', 'sql', 'mongodb', 'postgresql'];
    return commonTech.filter(tech => text.includes(tech));
  }

  extractProjectTechnologies(projects) {
    return projects.flatMap(proj => proj.technologies || []);
  }

  matchTechnologies(projectTechs, jobTechs) {
    const normalizedProject = projectTechs.map(t => t.toLowerCase());
    return jobTechs.filter(jobTech => 
      normalizedProject.some(projTech => 
        projTech.includes(jobTech.toLowerCase()) || jobTech.toLowerCase().includes(projTech)
      )
    );
  }

  calculateTotalYears(experience) {
    let total = 0;
    for (const exp of experience) {
      if (exp.duration) {
        const match = exp.duration.match(/(\d+)\s*(years?|yrs?)/i);
        if (match) {
          total += parseInt(match[1]);
        }
      }
    }
    return total;
  }

  extractRequiredYears(jobJSON) {
    const text = (jobJSON.experience || '').toLowerCase();
    const match = text.match(/(\d+)\s*(years?|yrs?)/i);
    return match ? parseInt(match[1]) : 0;
  }

  isEducationRelevant(education, required) {
    const requiredLower = required.toLowerCase();
    return education.some(edu => {
      const eduText = `${edu.degree || ''} ${edu.specialization || ''} ${edu.college || ''}`.toLowerCase();
      return requiredLower.includes(eduText) || eduText.includes(requiredLower);
    });
  }

  // Fallback methods when embeddings are not available
  fallbackSkillMatch(resumeSkills, jobSkills) {
    const matched = jobSkills.filter(jobSkill =>
      resumeSkills.some(resumeSkill =>
        resumeSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(resumeSkill.toLowerCase())
      )
    );
    const missing = jobSkills.filter(s => !matched.includes(s));
    const score = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 100;
    return { score, matched: matched.map(s => ({ skill: s, matchedWith: s, similarity: 1 })), missing, recommended: [] };
  }

  fallbackExperienceMatch(totalYears, requiredYears) {
    const gap = Math.max(0, requiredYears - totalYears);
    const score = requiredYears > 0 ? Math.min(100, (totalYears / requiredYears) * 100) : 100;
    return { score, totalYears, gap, semanticSimilarity: score };
  }

  fallbackProjectMatch(projects, jobTechnologies) {
    const projectTechs = this.extractProjectTechnologies(projects);
    const matched = this.matchTechnologies(projectTechs, jobTechnologies);
    const missing = jobTechnologies.filter(t => !matched.includes(t));
    const score = jobTechnologies.length > 0 ? Math.round((matched.length / jobTechnologies.length) * 100) : 100;
    return { score, matchedProjects: projects, missingTechnologies: missing, semanticSimilarity: score };
  }

  fallbackEducationMatch(education, required) {
    const relevant = this.isEducationRelevant(education, required);
    const score = relevant ? 80 : 40;
    return { score, relevant, semanticSimilarity: score };
  }

  fallbackKeywordMatch(resumeJSON, jobJSON) {
    const resumeText = JSON.stringify(resumeJSON).toLowerCase();
    const jobText = (jobJSON.description || '').toLowerCase();
    const jobKeywords = this.extractJobSkills(jobJSON);
    const matched = jobKeywords.filter(k => resumeText.includes(k.toLowerCase()));
    const score = jobKeywords.length > 0 ? Math.round((matched.length / jobKeywords.length) * 100) : 50;
    return { score, semanticSimilarity: score };
  }

  // Explanation methods with transparent attribution
  explainSkillsScore(result, jobJSON, weight) {
    const reason = [];
    reason.push(`Weight: ${weight}% of total score`);
    if (result.matched.length > 0) {
      reason.push(`Matched ${result.matched.length} skills: ${result.matched.slice(0, 3).map(m => m.skill).join(', ')}${result.matched.length > 3 ? '...' : ''}`);
    }
    if (result.missing.length > 0) {
      reason.push(`Missing ${result.missing.length} skills: ${result.missing.slice(0, 3).join(', ')}${result.missing.length > 3 ? '...' : ''}`);
    }
    return { score: result.score, reason: reason.join('. '), weight, contribution: Math.round(result.score * weight / 100) };
  }

  explainExperienceScore(result, jobJSON, weight) {
    const reason = [];
    reason.push(`Weight: ${weight}% of total score`);
    reason.push(`Total experience: ${result.totalYears} years`);
    if (result.gap > 0) {
      reason.push(`Gap: ${result.gap} years to requirements`);
    }
    reason.push(`Semantic similarity: ${result.semanticSimilarity}%`);
    return { score: result.score, reason: reason.join('. '), weight, contribution: Math.round(result.score * weight / 100) };
  }

  explainProjectScore(result, jobJSON, weight) {
    const reason = [];
    reason.push(`Weight: ${weight}% of total score`);
    reason.push(`${result.matchedProjects.length} relevant projects`);
    reason.push(`Semantic similarity: ${result.semanticSimilarity}%`);
    return { score: result.score, reason: reason.join('. '), weight, contribution: Math.round(result.score * weight / 100) };
  }

  explainEducationScore(result, jobJSON, weight) {
    const reason = [];
    reason.push(`Weight: ${weight}% of total score`);
    reason.push(`Education relevant: ${result.relevant ? 'Yes' : 'No'}`);
    reason.push(`Semantic similarity: ${result.semanticSimilarity}%`);
    return { score: result.score, reason: reason.join('. '), weight, contribution: Math.round(result.score * weight / 100) };
  }

  explainResponsibilityScore(result, jobJSON, weight) {
    const reason = [];
    reason.push(`Weight: ${weight}% of total score`);
    reason.push(`${result.matched.length} responsibilities matched`);
    reason.push(`Semantic similarity: ${result.semanticSimilarity}%`);
    return { score: result.score, reason: reason.join('. '), weight, contribution: Math.round(result.score * weight / 100) };
  }

  explainKeywordScore(result, jobJSON, weight) {
    const reason = [];
    reason.push(`Weight: ${weight}% of total score`);
    reason.push(`Semantic similarity: ${result.semanticSimilarity}%`);
    return { score: result.score, reason: reason.join('. '), weight, contribution: Math.round(result.score * weight / 100) };
  }
}

export default SemanticATSEngine;
