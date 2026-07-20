/**
 * Experience Matcher - Compares candidate experience with job requirements
 * Uses semantic matching for role titles, technologies, and responsibilities
 */

// Role title equivalence mappings - similar roles should match
const ROLE_EQUIVALENTS = {
  'software engineer': ['full stack developer', 'fullstack developer', 'backend developer', 'frontend developer', 'web developer', 'application developer', 'software developer', 'developer', 'engineer'],
  'full stack developer': ['software engineer', 'fullstack developer', 'backend developer', 'frontend developer', 'web developer', 'application developer', 'software developer', 'developer'],
  'developer': ['software engineer', 'full stack developer', 'fullstack developer', 'backend developer', 'frontend developer', 'web developer', 'application developer', 'software developer', 'engineer'],
  'engineer': ['software engineer', 'developer', 'full stack developer', 'software developer'],
  'web developer': ['software engineer', 'developer', 'full stack developer', 'frontend developer'],
  'frontend developer': ['ui developer', 'web developer', 'react developer', 'angular developer'],
  'backend developer': ['api developer', 'server developer', 'node developer'],
};

// Flatten role equivalents for quick lookup
const ROLE_VARIATIONS = {};
for (const [role, equivalents] of Object.entries(ROLE_EQUIVALENTS)) {
  for (const equiv of equivalents) {
    ROLE_VARIATIONS[equiv.toLowerCase()] = [role, ...equivalents];
  }
}

// Technology skill variations
const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'nodejs', 'node.js', 'react', 'vue', 'angular',
  'html', 'css', 'nextjs', 'express', 'django', 'flask', 'spring', 'aws', 'docker', 'sql',
  'mongodb', 'postgresql', 'mysql', 'git', 'rest api', 'graphql', 'api', 'frontend', 'backend'
];

export class ExperienceMatcher {
  /**
   * Match candidate experience with job requirements
   */
  match(candidateExperience, jobRequirement) {
    // Calculate total years of experience even if no job requirement
    let totalYears = this.calculateTotalYears(candidateExperience);
    
    // If experience is empty but we have raw text, try to extract it
    if (totalYears === 0 && jobRequirement && jobRequirement.raw) {
      // Extract from job requirement raw text as fallback
      const extractedExp = this.extractExperienceFromText(jobRequirement.raw);
      totalYears = extractedExp.totalYears || 0;
      candidateExperience = extractedExp.experience || candidateExperience;
    }
    
    // If no job requirement, score based on total experience
    if (!jobRequirement || !jobRequirement.min) {
      const baseScore = Math.min(100, totalYears >= 3 ? 80 : totalYears >= 1 ? 60 : totalYears > 0 ? 40 : 20);
      return { 
        score: baseScore, 
        totalYears, 
        gap: 0, 
        type: 'none',
        matchedRoles: this.extractRoleTitles(candidateExperience),
        technologiesUsed: this.extractTechnologies(candidateExperience),
        responsibilitiesMatched: []
      };
    }
    
    // Check experience level match
    const levelMatch = this.matchExperienceLevel(candidateExperience, jobRequirement);
    
    // Check role title match
    const roleTitles = this.extractRoleTitles(candidateExperience);
    const roleMatchScore = this.calculateRoleMatchScore(roleTitles, jobRequirement);
    
    // Check technology overlap
    const expTech = this.extractTechnologies(candidateExperience);
    const techMatchScore = this.calculateTechMatchScore(expTech, jobRequirement);
    
    // Combine scores
    let score = Math.round((levelMatch.score * 0.4 + roleMatchScore * 0.3 + techMatchScore * 0.3));
    score = Math.max(0, Math.min(100, score));
    
    // Calculate gap if needed
    const gap = jobRequirement.min > totalYears 
      ? jobRequirement.min - totalYears 
      : 0;
    
    return { 
      score, 
      totalYears, 
      gap, 
      type: levelMatch.type,
      matchedRoles: roleTitles,
      technologiesUsed: expTech,
      responsibilitiesMatched: []
    };
  }
  
  /**
   * Extract role titles from experience
   */
  extractRoleTitles(experience) {
    if (!Array.isArray(experience)) return [];
    
    return experience
      .map(exp => exp.title || '')
      .filter(t => t)
      .map(t => t.toLowerCase());
  }
  
  /**
   * Extract technologies from experience
   */
  extractTechnologies(experience) {
    if (!Array.isArray(experience)) return [];
    
    const tech = [];
    for (const exp of experience) {
      const expText = `${exp.title || ''} ${exp.description || ''} ${JSON.stringify(exp.bullets || [])}`.toLowerCase();
      for (const skill of TECH_SKILLS) {
        if (expText.includes(skill)) {
          tech.push(skill);
        }
      }
    }
    return [...new Set(tech)];
  }
  
  /**
   * Calculate total years of experience
   */
  calculateTotalYears(experience) {
    if (!Array.isArray(experience) || experience.length === 0) {
      return 0;
    }
    
    let totalYears = 0;
    
    for (const exp of experience) {
      const years = this.extractYearsFromExperience(exp);
      totalYears += years;
    }
    
    return Math.min(totalYears, 30); // Cap at 30 years
  }
  
  /**
   * Extract years from a single experience entry
   */
  extractYearsFromExperience(exp) {
    if (!exp) return 0;
    
    // Check for explicit duration
    if (exp.duration) {
      const match = exp.duration.match(/(\d+)\s*(?:years?|yrs?)/i);
      if (match) return parseInt(match[1]);
    }
    
    // Check for date range
    if (exp.startDate && exp.endDate) {
      const start = this.parseDate(exp.startDate);
      const end = this.parseDate(exp.endDate);
      if (start && end) {
        const years = (end.getFullYear() - start.getFullYear());
        const months = end.getMonth() - start.getMonth();
        return Math.max(0, years + (months > 0 ? 0.5 : 0));
      }
    }
    
    // Check for dates in text
    if (exp.raw) {
      const yearMatches = exp.raw.match(/\b(19|20)\d{2}\b/g);
      if (yearMatches && yearMatches.length >= 2) {
        const startYear = parseInt(yearMatches[0]);
        const endYear = parseInt(yearMatches[yearMatches.length - 1]);
        const diff = endYear - startYear;
        if (diff > 0) return diff;
      }
      
      // Check for "X years" pattern in text
      const yearsMatch = exp.raw.match(/(\d+)\s*(?:years?|yrs?)/i);
      if (yearsMatch) return parseInt(yearsMatch[1]);
    }
    
    // Default: if there's any experience entry, give at least 1 year
    if (exp.title || exp.company) {
      return 1;
    }
    
    return 0;
  }
  
  /**
   * Match experience level
   */
  matchExperienceLevel(candidateExperience, jobRequirement) {
    const totalYears = this.calculateTotalYears(candidateExperience);
    
    if (totalYears >= jobRequirement.min && totalYears <= jobRequirement.max) {
      return { score: 100, type: 'exact' };
    }
    
    if (totalYears >= jobRequirement.min) {
      return { score: 90, type: 'exceeds' };
    }
    
    const gap = jobRequirement.min - totalYears;
    const score = Math.max(30, 80 - (gap * 10));
    
    return { score, totalYears, gap, type: 'under' };
  }
  
  /**
   * Calculate role title match score
   */
  calculateRoleMatchScore(roleTitles, jobRequirement) {
    if (!roleTitles || roleTitles.length === 0) return 40; // Base score for no titles
    
    const jobTexts = [
      jobRequirement.raw || '',
      jobRequirement.title || '',
    ].join(' ').toLowerCase();
    
    let matchedCount = 0;
    for (const title of roleTitles) {
      // Check if this experience title is equivalent to job role
      const equivalents = ROLE_VARIATIONS[title] || [title];
      if (equivalents.some(equiv => jobTexts.includes(equiv))) {
        matchedCount++;
      }
    }
    
    // If no specific role match, check for general technical roles
    if (matchedCount === 0) {
      for (const title of roleTitles) {
        if (title.includes('developer') || title.includes('engineer') || title.includes('programmer')) {
          matchedCount = 1;
          break;
        }
      }
    }
    
    return matchedCount > 0 
      ? Math.round(50 + (matchedCount / roleTitles.length) * 50)
      : 40;
  }
  
  /**
   * Calculate technology match score
   */
  calculateTechMatchScore(expTech, jobRequirement) {
    if (!expTech || expTech.length === 0) return 30;
    
    const jobTexts = [
      jobRequirement.raw || '',
      jobRequirement.title || '',
    ].join(' ').toLowerCase();
    
    let matchedCount = 0;
    for (const tech of expTech) {
      // Check for semantic tech matching
      if (jobTexts.includes(tech) || this.isTechSemanticallyRelated(tech, jobTexts)) {
        matchedCount++;
      }
    }
    
    return matchedCount > 0
      ? Math.round(40 + (matchedCount / Math.max(expTech.length, 1)) * 60)
      : 30;
  }
  
  /**
   * Check if technology is semantically related
   */
  isTechSemanticallyRelated(tech, jobText) {
    const techLower = tech.toLowerCase();
    
    // Programming/Scripting languages should match "programming", "coding", "development"
    if (['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'go', 'ruby', 'sql'].some(lang => techLower.includes(lang))) {
      if (jobText.includes('programming') || jobText.includes('coding') || jobText.includes('software')) {
        return true;
      }
    }
    
    // Frontend tech should match frontend requirements
    if (['react', 'vue', 'angular', 'html', 'css', 'frontend'].some(f => techLower.includes(f))) {
      if (jobText.includes('frontend') || jobText.includes('ui') || jobText.includes('web')) {
        return true;
      }
    }
    
    // Backend tech should match backend requirements
    if (['nodejs', 'express', 'backend', 'api', 'server'].some(b => techLower.includes(b))) {
      if (jobText.includes('backend') || jobText.includes('api') || jobText.includes('server')) {
        return true;
      }
    }
    
    // Database tech should match database requirements
    if (['sql', 'mongodb', 'postgres', 'mysql', 'database'].some(d => techLower.includes(d))) {
      if (jobText.includes('database') || jobText.includes('sql') || jobText.includes('data')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Parse date string into Date object
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    const patterns = [
      /(\w+)\s+(\d{4})/,  // Jan 2020
      /(\d{4})/,           // 2020
      /(\d{1,2})\/(\d{4})/, // 01/2020
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (match.length === 3) {
          try {
            const month = new Date(Date.parse(match[1] + " 1")).getMonth() + 1;
            const year = parseInt(match[2]);
            return new Date(year, month - 1);
          } catch {
            const year = parseInt(match[1]);
            return new Date(year, 0);
          }
        }
        const year = parseInt(match[1]);
        return new Date(year, 0);
      }
    }
    
    return null;
  }
}