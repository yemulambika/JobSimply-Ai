/**
 * Project Matcher - Compares candidate projects with job requirements
 * Uses semantic matching for technologies
 */

// Technology categories for semantic matching
const TECH_CATEGORIES = {
  'frontend': ['react', 'vue', 'angular', 'html', 'css', 'nextjs', 'typescript', 'bootstrap', 'tailwind', 'redux'],
  'backend': ['nodejs', 'node.js', 'express', 'python', 'java', 'spring', 'django', 'flask', 'php', 'ruby'],
  'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'nosql', 'redis', 'database'],
  'api': ['api', 'rest api', 'restful', 'graphql', 'microservices'],
  'devops': ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'jenkins'],
};

export class ProjectMatcher {
  /**
   * Match candidate projects with job requirements
   */
  match(candidateProjects, job) {
    // Normalize projects to array
    const projects = Array.isArray(candidateProjects) ? candidateProjects : [];
    
    // Extract technologies from job
    const jobTechnologies = this.extractJobTechnologies(job);
    const jobSkills = job.requiredSkills || [];
    const allRequiredTech = [...new Set([...jobTechnologies, ...jobSkills])];
    
    // If no projects, score based on technologies found in job
    if (projects.length === 0) {
      // Check for experience with relevant technologies
      const techScore = allRequiredTech.length > 0 ? 30 + Math.min(50, allRequiredTech.length * 5) : 20;
      return { 
        score: techScore, 
        matchedProjects: [], 
        missingTechnologies: allRequiredTech,
        explanation: 'No explicit projects found. Consider adding project section to your resume.'
      };
    }
    
    const matchedProjects = [];
    const foundTech = new Set();
    
    for (const project of projects) {
      const projectTech = this.getProjectTechnologies(project);
      const { matchCount, relevanceScore } = this.calculateProjectMatch(projectTech, allRequiredTech);
      
      if (matchCount > 0 || relevanceScore > 0) {
        matchedProjects.push({
          title: project.title || 'Untitled',
          technologies: projectTech,
          matchCount,
          relevanceScore
        });
        projectTech.forEach(t => foundTech.add(t));
      }
    }
    
    const missingTechnologies = allRequiredTech.filter(t => !foundTech.has(t));
    const score = this.calculateOverallProjectScore(matchedProjects, allRequiredTech, projects.length);
    
    const explanation = this.generateExplanation(matchedProjects.length, missingTechnologies.length, allRequiredTech.length);
    
    return { score, matchedProjects, missingTechnologies, explanation };
  }
  
  /**
   * Extract technologies from a project
   */
  getProjectTechnologies(project) {
    if (!project) return [];
    if (project.technologies && Array.isArray(project.technologies)) {
      return project.technologies.map(t => String(t).toLowerCase());
    }
    // Try to extract from description
    if (project.description) {
      const desc = String(project.description).toLowerCase();
      const tech = [];
      for (const keyword of ['react', 'node', 'nodejs', 'javascript', 'typescript', 'python', 'java', 'aws', 'docker', 'sql', 'mongodb', 'postgresql', 'mysql', 'express', 'django', 'flask', 'spring', 'angular', 'vue', 'nextjs', 'html', 'css']) {
        if (desc.includes(keyword)) tech.push(keyword);
      }
      return tech;
    }
    return [];
  }
  
  /**
   * Extract technologies from job description
   */
  extractJobTechnologies(job) {
    const tech = [];
    const jobText = `${job.title || ''} ${job.description || ''} ${JSON.stringify(job)}`.toLowerCase();
    
    // Check for technology keywords
    const techKeywords = [
      'react', 'node', 'nodejs', 'node.js', 'javascript', 'typescript', 'python', 
      'java', 'aws', 'docker', 'sql', 'mongodb', 'postgresql', 'mysql',
      'express', 'django', 'flask', 'spring', 'angular', 'vue', 'nextjs',
      'html', 'css', 'git', 'kubernetes', 'graphql', 'rest api'
    ];
    
    for (const keyword of techKeywords) {
      if (jobText.includes(keyword)) {
        tech.push(keyword);
      }
    }
    
    return [...new Set(tech)];
  }
  
  /**
   * Calculate project match with semantic matching
   */
  calculateProjectMatch(projectTech, requiredTech) {
    let matchCount = 0;
    let relevanceScore = 0;
    
    for (const tech of projectTech) {
      if (requiredTech.includes(tech)) {
        matchCount++;
        relevanceScore += 10;
      } else {
        // Check semantic categories
        for (const [category, categoryTech] of Object.entries(TECH_CATEGORIES)) {
          const techInCategory = categoryTech.some(t => tech.includes(t) || t.includes(tech));
          const jobNeedsCategory = requiredTech.some(t => categoryTech.some(ct => t.includes(ct) || ct.includes(t)));
          
          if (techInCategory && jobNeedsCategory) {
            matchCount += 0.5; // Partial credit for category match
            relevanceScore += 5;
          }
        }
      }
    }
    
    return { matchCount, relevanceScore: Math.min(100, relevanceScore) };
  }
  
  /**
   * Calculate overall project score
   */
  calculateOverallProjectScore(matchedProjects, requiredTech, totalProjects) {
    if (requiredTech.length === 0) return 100;
    if (totalProjects === 0) return 20;
    
    const coverage = matchedProjects.reduce((sum, p) => sum + p.matchCount, 0);
    const avgRelevance = matchedProjects.reduce((sum, p) => sum + p.relevanceScore, 0) / Math.max(matchedProjects.length, 1);
    
    // Score based on coverage and relevance
    return Math.min(100, Math.round((coverage / requiredTech.length) * 50 + (avgRelevance / 100) * 30 + 20));
  }
  
  /**
   * Generate explanation for project score
   */
  generateExplanation(matchedCount, missingCount, totalRequired) {
    const explanations = [];
    
    if (matchedCount === 0) {
      explanations.push('No projects match job requirements');
    } else {
      explanations.push(`${matchedCount} project(s) show relevant technology experience`);
    }
    
    if (missingCount > 0) {
      explanations.push(`${missingCount} required technology areas not demonstrated in projects`);
    }
    
    if (matchedCount > 0 && missingCount === 0) {
      explanations.push('All required technologies demonstrated in projects');
    }
    
    return explanations.join('. ');
  }
}