/**
 * Education Matcher - Compares candidate education with job requirements
 * Recognizes B.Tech, BE, Bachelor, Bachelor of Engineering, etc. as compatible
 */

// Education degree hierarchy
const DEGREE_LEVELS = {
  'high school': 1,
  'diploma': 2,
  'associate': 3,
  'bachelor': 4,
  'master': 5,
  'mba': 5,
  'phd': 6,
  'doctorate': 6,
};

// Education synonyms - all these are equivalent for matching
const EDUCATION_SYNONYMS = {
  'bachelor': ['bachelor', 'bachelor of engineering', 'bachelor of technology', 'b.e', 'b.e.', 'be', 'b.tech', 'b.sc', 'bachelor of science'],
  'master': ['master', 'master of engineering', 'master of technology', 'm.e', 'm.e.', 'me', 'm.tech', 'm.sc', 'master of science', 'mba'],
  'bachelor of engineering': ['bachelor', 'b.e', 'b.e.', 'be', 'b.tech', 'bachelor of science', 'b.sc'],
  'bachelor of technology': ['bachelor', 'b.e', 'b.e.', 'be', 'b.tech', 'bachelor of science', 'b.sc'],
  'b.e': ['bachelor', 'b.e.', 'be', 'b.tech', 'bachelor of engineering'],
  'b.tech': ['bachelor', 'b.e', 'b.e.', 'be', 'bachelor of technology'],
};

// Relevant fields for tech jobs
const RELEVANT_FIELDS = [
  'computer science', 'information technology', 'software engineering', 
  'computer engineering', 'data science', 'artificial intelligence',
  'machine learning', 'cybersecurity', 'networking', 'computer applications',
  'bca', 'mca', 'bsc', 'msc'
];

/**
 * Extract education degree from text using synonyms
 */
function extractEducationDegree(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  // Check for bachelor equivalents
  for (const [degree, synonyms] of Object.entries(EDUCATION_SYNONYMS)) {
    if (synonyms.some(s => lowerText.includes(s))) {
      return 'bachelor';
    }
  }
  
  // Check for master equivalents
  if (lowerText.includes('master') || lowerText.includes('m.') || lowerText.includes('m.tech') || lowerText.includes('mca')) {
    return 'master';
  }
  
  // Check for PhD
  if (lowerText.includes('phd') || lowerText.includes('doctorate')) {
    return 'phd';
  }
  
  return null;
}

export class EducationMatcher {
  /**
   * Match candidate education with job requirements
   */
  match(candidateEducation, jobRequirement) {
    if (!Array.isArray(candidateEducation) || candidateEducation.length === 0) {
      return { 
        score: 30, 
        highestDegree: null, 
        relevant: false, 
        explanation: 'No education information found in resume' 
      };
    }
    
    const highestLevel = this.getHighestDegreeLevel(candidateEducation);
    const relevant = this.hasRelevantField(candidateEducation);
    const degreeNames = this.getDegreeNames(candidateEducation);
    
    // Calculate score
    let score = 50; // Base score for having education
    
    if (highestLevel >= 4) score += 30; // Bachelor's or higher
    if (highestLevel >= 5) score += 10; // Master's or higher
    if (highestLevel >= 6) score += 10; // PhD or higher
    if (relevant) score += 10; // Relevant field
    
    // If no job requirement specified, give high score
    if (!jobRequirement || jobRequirement.length === 0) {
      // Check for any bachelor/master equivalent
      if (degreeNames.some(d => d === 'bachelor')) score = 90;
      if (degreeNames.some(d => d === 'master' || d === 'phd')) score = 100;
    }
    
    const explanation = this.generateExplanation(highestLevel, relevant, degreeNames, jobRequirement);
    
    return { score: Math.min(100, score), highestDegree: highestLevel, relevant, explanation };
  }
  
  /**
   * Get highest degree level
   */
  getHighestDegreeLevel(education) {
    let maxLevel = 0;
    
    for (const edu of education) {
      if (!edu || !edu.degree) continue;
      
      const lowerDegree = edu.degree.toLowerCase();
      const extractedDegree = extractEducationDegree(lowerDegree);
      
      // Check extracted degree
      if (extractedDegree && DEGREE_LEVELS[extractedDegree]) {
        maxLevel = Math.max(maxLevel, DEGREE_LEVELS[extractedDegree]);
      }
      
      // Check degree level indicators
      if (lowerDegree.includes('b.') || lowerDegree.includes('bachelor') || lowerDegree.includes('undergraduate')) {
        maxLevel = Math.max(maxLevel, 4);
      }
      if (lowerDegree.includes('m.') || lowerDegree.includes('master') || lowerDegree.includes('mba')) {
        maxLevel = Math.max(maxLevel, 5);
      }
      if (lowerDegree.includes('phd') || lowerDegree.includes('doctorate')) {
        maxLevel = Math.max(maxLevel, 6);
      }
      if (lowerDegree.includes('diploma') || lowerDegree.includes('associate')) {
        maxLevel = Math.max(maxLevel, 2);
      }
    }
    
    return maxLevel;
  }
  
  /**
   * Check if education has relevant field
   */
  hasRelevantField(education) {
    for (const edu of education) {
      if (!edu || !edu.degree) continue;
      const lower = edu.degree.toLowerCase();
      if (RELEVANT_FIELDS.some(f => lower.includes(f))) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get normalized degree names
   */
  getDegreeNames(education) {
    const names = [];
    for (const edu of education) {
      if (!edu || !edu.degree) continue;
      const extracted = extractEducationDegree(edu.degree);
      if (extracted) names.push(extracted);
    }
    return [...new Set(names)];
  }
  
  /**
   * Generate explanation for education score
   */
  generateExplanation(highestLevel, relevant, degreeNames, jobRequirement) {
    const explanations = [];
    
    if (degreeNames.length > 0) {
      explanations.push(`Found ${degreeNames.join(', ')} degree(s)`);
    }
    
    if (highestLevel >= 4) {
      explanations.push('Has bachelor\'s degree or equivalent');
    }
    
    if (highestLevel >= 5) {
      explanations.push('Has master\'s degree or higher');
    }
    
    if (relevant) {
      explanations.push('Education is in relevant technical field (CS, IT, Software Engineering)');
    }
    
    // Check if requirements are met
    if (jobRequirement && jobRequirement.length > 0) {
      const requiredBachelor = jobRequirement.some(req => req && req.degree && req.degree.includes('bachelor'));
      if (requiredBachelor && highestLevel >= 4) {
        explanations.push('Meets bachelor\'s degree requirement');
      } else if (requiredBachelor) {
        explanations.push('Does not meet bachelor\'s degree requirement');
      }
    }
    
    return explanations.join('. ');
  }
}