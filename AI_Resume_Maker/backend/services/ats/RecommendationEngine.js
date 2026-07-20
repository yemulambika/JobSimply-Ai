/**
 * Recommendation Engine - Generates actionable recommendations for resume optimization
 * Infers meaningful missing concepts from job requirements
 */

// Skill categories for inference
const SKILL_CATEGORIES = {
  'software development': ['software development', 'software engineering', 'application development', 'developer', 'full stack', 'web development', 'programming', 'coding'],
  'backend': ['nodejs', 'node.js', 'express', 'python', 'java', 'spring', 'django', 'flask', 'backend', 'server', 'api', 'rest api', 'graphql'],
  'frontend': ['react', 'vue', 'angular', 'html', 'css', 'frontend', 'ui', 'ux'],
  'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'database', 'nosql'],
  'devops': ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'ci/cd', 'jenkins', 'terraform'],
  'testing': ['testing', 'test', 'jest', 'mocha', 'cypress', 'selenium', 'tdd'],
};

// Infer category from skill
function inferSkillCategory(skill) {
  const lowerSkill = skill.toLowerCase();
  for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
    if (keywords.some(k => lowerSkill.includes(k) || k.includes(lowerSkill))) {
      return category;
    }
  }
  return null;
}

// Meaningful missing concept mappings
const MISSING_CONCEPTS = {
  'software development': ['Software Design', 'System Architecture', 'Code Quality', 'Maintenance', 'Research'],
  'backend': ['API Development', 'Database Design', 'Server Management', 'Microservices'],
  'frontend': ['UI/UX Design', 'Responsive Design', 'Component Architecture'],
  'database': ['Data Modeling', 'Query Optimization', 'Schema Design'],
  'devops': ['CI/CD Pipeline', 'Cloud Deployment', 'Container Orchestration'],
};

export class RecommendationEngine {
  /**
   * Generate recommendations based on analysis results
   */
  generate(analysis, parsedResume, parsedJob) {
    const recommendations = [];
    
    // Skills recommendations with semantic inference
    recommendations.push(...this.getSkillRecommendations(analysis.missingSkills, parsedJob, parsedResume));
    
    // Experience recommendations
    if (analysis.experienceGap > 0) {
      recommendations.push(`Consider highlighting transferable experience or projects to bridge the ${analysis.experienceGap} year experience gap`);
    }
    
    // Project recommendations
    recommendations.push(...this.getProjectRecommendations(analysis.missingTechnologies, parsedResume));
    
    // Education recommendations
    if (!analysis.educationRelevant && parsedJob.requiredEducation.length > 0) {
      recommendations.push('Consider highlighting relevant coursework or certifications if you have a non-traditional background');
    }
    
    // Responsibility recommendations
    recommendations.push(...this.getResponsibilityRecommendations(parsedJob.responsibilities, parsedResume.experience));
    
    // Add high-value conceptual recommendations
    recommendations.push(...this.getConceptualRecommendations(parsedJob));
    
    return [...new Set(recommendations)].slice(0, 10);
  }
  
  /**
   * Skill recommendations with semantic inference
   */
  getSkillRecommendations(missingSkills, parsedJob, parsedResume) {
    const recommendations = [];
    
    // Filter to meaningful skills only
    const meaningfulSkills = missingSkills.filter(s => s.length > 2);
    
    if (meaningfulSkills.length > 0) {
      const topSkills = meaningfulSkills.slice(0, 5);
      recommendations.push(`Add experience with: ${topSkills.join(', ')}`);
    }
    
    // Check for missing categories and suggest conceptual additions
    const candidateSkills = this.getAllCandidateSkills(parsedResume);
    const missingCategories = this.inferMissingCategories(candidateSkills, parsedJob);
    
    if (missingCategories.length > 0) {
      recommendations.push(`Consider highlighting: ${missingCategories.join(', ')}`);
    }
    
    return recommendations;
  }
  
  /**
   * Get all candidate skills
   */
  getAllCandidateSkills(parsedResume) {
    const skills = [];
    if (parsedResume.skills) {
      for (const category of Object.values(parsedResume.skills)) {
        if (Array.isArray(category)) {
          skills.push(...category.map(s => s.toLowerCase()));
        }
      }
    }
    if (parsedResume.experience) {
      for (const exp of parsedResume.experience) {
        if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
          for (const resp of exp.responsibilities) {
            skills.push(...this.extractSkillsFromResponsibility(resp));
          }
        }
      }
    }
    return [...new Set(skills)];
  }
  
  extractSkillsFromResponsibility(responsibility) {
    const skills = [];
    const lower = responsibility.toLowerCase();
    for (const skill of ['javascript', 'react', 'node', 'python', 'java', 'sql', 'docker', 'aws', 'api']) {
      if (lower.includes(skill)) {
        skills.push(skill);
      }
    }
    return skills;
  }
  
  /**
   * Infer missing categories
   */
  inferMissingCategories(candidateSkills, parsedJob) {
    const missing = [];
    const jobSkills = [...(parsedJob.requiredSkills || []), ...(parsedJob.preferredSkills || [])];
    
    for (const skill of jobSkills) {
      const category = inferSkillCategory(skill);
      if (category && MISSING_CONCEPTS[category]) {
        const hasInCandidate = candidateSkills.some(cs => {
          const csCategory = inferSkillCategory(cs);
          return csCategory === category;
        });
        if (!hasInCandidate && !missing.includes(category)) {
          missing.push(...MISSING_CONCEPTS[category].slice(0, 2));
        }
      }
    }
    
    return missing;
  }
  
  /**
   * Project recommendations
   */
  getProjectRecommendations(missingTechnologies, parsedResume) {
    const recommendations = [];
    
    if (missingTechnologies.length > 0) {
      const techToAdd = missingTechnologies.slice(0, 3);
      // Provide more meaningful recommendations
      recommendations.push(`Add projects showcasing: ${techToAdd.join(', ')}`);
    }
    
    return recommendations;
  }
  
  /**
   * Responsibility recommendations
   */
  getResponsibilityRecommendations(jobResponsibilities, candidateExperience) {
    const recommendations = [];
    
    const candidateText = this.getCandidateResponsibilityText(candidateExperience);
    
    const actionVerbs = ['develop', 'design', 'build', 'lead', 'deploy', 'test', 'maintain', 'create'];
    const missingVerbs = actionVerbs.filter(verb => {
      const hasJobResponsibility = jobResponsibilities.some(r => r.toLowerCase().includes(verb));
      const hasCandidateExperience = candidateText.toLowerCase().includes(verb);
      return hasJobResponsibility && !hasCandidateExperience;
    });
    
    if (missingVerbs.length > 0) {
      recommendations.push(`Highlight experience with: ${missingVerbs.slice(0, 3).join(', ')}`);
    }
    
    return recommendations;
  }
  
  getCandidateResponsibilityText(experience) {
    let text = '';
    for (const exp of experience) {
      if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
        text += ' ' + exp.responsibilities.join(' ');
      }
      if (exp.raw) {
        text += ' ' + exp.raw;
      }
    }
    return text;
  }
  
  /**
   * Generate conceptual recommendations
   */
  getConceptualRecommendations(parsedJob) {
    const recommendations = [];
    const jobText = `${parsedJob.title || ''} ${parsedJob.description || ''}`.toLowerCase();
    
    // Software Development concepts
    if (jobText.includes('software') || jobText.includes('engineer')) {
      recommendations.push('Consider highlighting: Software Design, System Architecture, Code Quality');
    }
    
    // Maintenance concepts
    if (jobText.includes('maintain') || jobText.includes('maintenance')) {
      recommendations.push('Consider highlighting: Maintenance experience, System Updates, Bug Fixes');
    }
    
    // Research concepts
    if (jobText.includes('research') || jobText.includes('innovate')) {
      recommendations.push('Consider highlighting: Research experience, Innovation, Problem Solving');
    }
    
    return recommendations;
  }
}