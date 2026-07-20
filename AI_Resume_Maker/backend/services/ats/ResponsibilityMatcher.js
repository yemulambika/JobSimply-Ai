/**
 * Responsibility Matcher - Compares candidate experience responsibilities with job requirements
 * Uses semantic matching for responsibilities
 */

// Action verb variations for matching
const VERB_VARIATIONS = {
  'develop': ['developed', 'developing', 'development', 'developer', 'developing'],
  'design': ['designed', 'designing', 'design'],
  'build': ['built', 'building', 'builds'],
  'create': ['created', 'creating', 'creates'],
  'implement': ['implemented', 'implementing', 'implementation'],
  'maintain': ['maintained', 'maintaining'],
  'test': ['tested', 'testing'],
  'deploy': ['deployed', 'deploying'],
  'manage': ['managed', 'managing'],
  'lead': ['led', 'leading'],
  'collaborate': ['collaborated', 'collaborating'],
};

// Responsibility synonyms
const RESPONSIBILITY_SYNONYMS = {
  'rest apis': ['rest api', 'api', 'apis'],
  'web applications': ['web app', 'application', 'web application'],
  'database systems': ['database', 'sql', 'nosql'],
  'software systems': ['software', 'system', 'application'],
  'technical design': ['design', 'architecture', 'architectural'],
};

// Skill-based responsibility mapping
const SKILL_TO_RESPONSIBILITY = {
  'javascript': ['develop', 'build', 'code'],
  'react': ['develop', 'build', 'design', 'frontend'],
  'nodejs': ['develop', 'build', 'backend', 'api', 'server'],
  'python': ['develop', 'build', 'code', 'script'],
  'sql': ['database', 'query', 'data'],
  'docker': ['deploy', 'container', 'deploying'],
};

export class ResponsibilityMatcher {
  /**
   * Match candidate responsibilities with job requirements
   */
  match(candidateExperience, jobResponsibilities) {
    if (!Array.isArray(jobResponsibilities) || jobResponsibilities.length === 0) {
      return { score: 100, matched: [], unmatched: [], explanation: 'No specific responsibilities required' };
    }
    
    if (!Array.isArray(candidateExperience) || candidateExperience.length === 0) {
      return { score: 40, matched: [], unmatched: jobResponsibilities, explanation: 'No experience entries found' };
    }
    
    const candidateText = this.getExperienceText(candidateExperience);
    const matched = [];
    const unmatched = [];
    
    for (const responsibility of jobResponsibilities) {
      const isMatched = this.matchResponsibility(responsibility, candidateText);
      if (isMatched) {
        matched.push(responsibility);
      } else {
        unmatched.push(responsibility);
      }
    }
    
    const score = Math.round((matched.length / jobResponsibilities.length) * 100);
    
    const explanation = this.generateExplanation(matched.length, unmatched.length, jobResponsibilities.length);
    
    return { score, matched, unmatched, explanation };
  }
  
  /**
   * Get all experience text
   */
  getExperienceText(experience) {
    let text = '';
    for (const exp of experience) {
      if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
        text += ' ' + exp.responsibilities.join(' ');
      }
      if (exp.raw) {
        text += ' ' + exp.raw;
      }
    }
    return text.toLowerCase();
  }
  
  /**
   * Match a single responsibility
   */
  matchResponsibility(responsibility, candidateText) {
    const lowerResp = responsibility.toLowerCase();
    
    // Check for exact match
    if (candidateText.includes(lowerResp)) {
      return true;
    }
    
    // Check for verb variations
    for (const [baseVerb, variations] of Object.entries(VERB_VARIATIONS)) {
      if (lowerResp.includes(baseVerb)) {
        // Check if any variation exists in candidate text
        for (const variation of variations) {
          if (candidateText.includes(variation)) {
            return true;
          }
        }
      }
      
      // Check if job responsibility uses a variation and candidate uses the base verb
      for (const variation of variations) {
        if (lowerResp.includes(variation)) {
          if (candidateText.includes(baseVerb)) {
            return true;
          }
        }
      }
    }
    
    // Check for synonym matching
    for (const [term, synonyms] of Object.entries(RESPONSIBILITY_SYNONYMS)) {
      if (lowerResp.includes(term)) {
        if (synonyms.some(s => candidateText.includes(s))) {
          return true;
        }
      }
    }
    
    // Check for skill-based responsibility matching
    for (const [skill, verbs] of Object.entries(SKILL_TO_RESPONSIBILITY)) {
      if (candidateText.includes(skill)) {
        // If candidate has the skill, check if job mentions related responsibilities
        const skillBasedMatch = this.checkSkillBasedResponsibility(lowerResp, skill, verbs);
        if (skillBasedMatch) return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if skill implies relevant responsibilities
   */
  checkSkillBasedResponsibility(resp, skill, verbs) {
    const skillText = skill.toLowerCase();
    const respLower = resp.toLowerCase();
    
    // Programming skills imply development
    if (['javascript', 'typescript', 'python', 'java', 'php', 'go', 'react', 'vue', 'angular'].includes(skillText)) {
      if (respLower.includes('develop') || respLower.includes('build') || respLower.includes('code')) {
        return true;
      }
    }
    
    // Backend skills imply backend work
    if (['nodejs', 'node.js', 'express', 'python', 'java', 'spring'].includes(skillText)) {
      if (respLower.includes('backend') || respLower.includes('api') || respLower.includes('server')) {
        return true;
      }
    }
    
    // Frontend skills imply frontend work
    if (['react', 'vue', 'angular', 'html', 'css', 'frontend'].includes(skillText)) {
      if (respLower.includes('frontend') || respLower.includes('ui') || respLower.includes('web')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate explanation for responsibility score
   */
  generateExplanation(matchedCount, unmatchedCount, total) {
    const explanations = [];
    
    if (matchedCount === total) {
      explanations.push('All job responsibilities match candidate experience');
    } else if (matchedCount > total / 2) {
      explanations.push(`${matchedCount} of ${total} responsibilities match experience`);
    } else if (matchedCount > 0) {
      explanations.push(`${matchedCount} of ${total} responsibilities partially match experience`);
    } else {
      explanations.push('No responsibilities match found');
    }
    
    return explanations.join('. ');
  }
}