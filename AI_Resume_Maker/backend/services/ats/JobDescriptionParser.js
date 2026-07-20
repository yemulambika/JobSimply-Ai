/**
 * Job Description Parser - Extracts structured requirements from job descriptions
 * Implements keyword extraction with classification into Required/Preferred/Optional
 */

import { normalizeSkills, categorizeSkills } from './SkillNormalizer.js';

// Stop words to filter out
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'are', 'have', 'has', 'will',
  'from', 'your', 'you', 'our', 'who', 'was', 'were', 'been', 'being',
  'do', 'does', 'did', 'would', 'could', 'should', 'must', 'need', 'need',
  'work', 'working', 'year', 'years', 'join', 'team', 'company', 'role',
  // Additional stop words
  'we', 'are', 'looking', 'for', 'a', 'an', 'to', 'of', 'in', 'on', 'at',
]);

// All technical skills for extraction
const ALL_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'vue', 'angular', 'nextjs', 'svelte', 'jquery', 'bootstrap', 'tailwind', 'html', 'css',
  'nodejs', 'node.js', 'node', 'express', 'django', 'flask', 'spring', '.net', 'asp.net core', 'laravel',
  'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'firebase',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
  'git', 'github', 'gitlab', 'circleci', 'github actions', 'gitlab ci', 'ci/cd',
  'machine learning', 'tensorflow', 'pytorch', 'ai', 'nlp', 'computer vision', 'llm',
  'graphql', 'rest api', 'microservices',
];

export class JobDescriptionParser {
  /**
   * Parse job description into structured format
   */
  parse(job) {
    const text = job.description || '';
    const fullText = `${job.title || ''} ${job.company || ''} ${text}`.toLowerCase();
    
    // Handle skills passed from extension (requiredSkills, keywords)
    const passedSkills = job.requiredSkills || [];
    const passedKeywords = job.keywords || [];
    
    // Combine skills from text and passed skills
    const textSkills = this.extractSkills(text, 'required');
    const allSkills = [...new Set([...passedSkills, ...textSkills])];
    
    return {
      title: job.title || '',
      company: job.company || '',
      location: job.location || '',
      employmentType: job.employmentType || '',
      requiredExperience: this.extractExperienceRequirement(text),
      requiredEducation: this.extractEducationRequirement(text),
      responsibilities: this.extractResponsibilities(job),
      requiredSkills: allSkills,
      preferredSkills: this.extractSkills(text, 'preferred'),
      technologies: this.extractTechnologies(text),
      softSkills: this.extractSoftSkills(text),
      keywords: passedKeywords.length > 0 ? passedKeywords : this.extractKeywords(text),
      // Include raw for matching
      raw: text,
    };
  }
  
  /**
   * Extract required experience years
   */
  extractExperienceRequirement(text) {
    const patterns = [
      /(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience)?/i,
      /(?:minimum|min|at least)\s*(\d+)\s*(?:years?|yrs?)/i,
      /(\d+)\s*(?:years?|yrs?)\s*of\s*(?:experience|exp)/i,
      /(?:entry|mid|senior|lead|principal)\s*level/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 3 && typeof match[2] === 'string') {
          return { min: parseInt(match[1]), max: parseInt(match[2]), raw: match[0] };
        }
        if (match.length >= 2 && !isNaN(parseInt(match[1]))) {
          return { min: parseInt(match[1]), max: 99, raw: match[0] };
        }
      }
    }
    
    // Entry/mid/senior level mapping
    const levelMatch = /entry|mid|senior|lead|principal/i.exec(text);
    if (levelMatch) {
      const levelMap = { entry: 0, mid: 2, senior: 5, lead: 8, principal: 12 };
      const years = levelMap[levelMatch[0].toLowerCase()];
      return { min: years, max: years + 3, raw: levelMatch[0] };
    }
    
    // Default - assume 2-5 years for software engineer roles
    if (text.includes('software') && text.includes('engineer')) {
      return { min: 2, max: 5, raw: null };
    }
    
    return { min: 0, max: 99, raw: null };
  }
  
  /**
   * Extract education requirements
   */
  extractEducationRequirement(text) {
    const patterns = [
      /(?:bachelor|b\.?s|b\.?tech|b\.?e|undergraduate)\s*(?:degree)?/i,
      /(?:master|m\.?s|m\.?tech|m\.?e|graduate)\s*(?:degree)?/i,
      /(?:computer science|information technology|software engineering)/i,
    ];
    
    const found = [];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Check if it's a bachelor's equivalent
        const isBachelor = /bachelor|b\.?s|b\.?tech|b\.?e|undergraduate/i.test(match[0]);
        const isMaster = /master|m\.?s|m\.?tech|m\.?e/i.test(match[0]);
        const isCS = /computer science/i.test(match[0]);
        
        if (isBachelor) {
          found.push({ degree: 'bachelor', match: 'required', raw: match[0] });
        } else if (isMaster) {
          found.push({ degree: 'master', match: 'preferred', raw: match[0] });
        } else if (isCS) {
          found.push({ degree: 'computer science', match: 'preferred', raw: match[0] });
        }
      }
    }
    
    return found;
  }
  
  /**
   * Extract responsibilities from job description
   */
  extractResponsibilities(job) {
    const text = job.description || '';
    const responsibilities = [];
    
    const actionVerbs = ['develop', 'design', 'build', 'create', 'implement', 'maintain', 
                         'test', 'deploy', 'manage', 'lead', 'collaborate', 'responsible', 'required'];
    
    const bulletPattern = /[\n•●\-]\s*(.+)/g;
    let match;
    
    while ((match = bulletPattern.exec(text)) !== null) {
      const bullet = match[1].trim();
      const lowerBullet = bullet.toLowerCase();
      
      if (actionVerbs.some(v => lowerBullet.includes(v))) {
        responsibilities.push(bullet);
      }
    }
    
    return responsibilities;
  }
  
  /**
   * Extract skills from job description with classification
   */
  extractSkills(text, type = 'required') {
    const skills = [];
    const lowerText = text.toLowerCase();
    
    // Find skills in the full text
    for (const skill of ALL_SKILLS) {
      if (lowerText.includes(skill.toLowerCase())) {
        skills.push(skill);
      }
    }
    
    return normalizeSkills(skills);
  }
  
  /**
   * Extract technologies from job description
   */
  extractTechnologies(text) {
    const techKeywords = [
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
      'jenkins', 'github actions', 'gitlab ci', 'ci/cd', 'redis', 
      'kafka', 'rabbitmq', 'elasticsearch',
      'tensorflow', 'pytorch', 'scikit-learn', 'pandas',
      'webpack', 'vite', 'rollup', 'babel',
      'jest', 'mocha', 'cypress', 'selenium',
    ];
    
    const lowerText = text.toLowerCase();
    return techKeywords.filter(t => lowerText.includes(t));
  }
  
  /**
   * Extract soft skills from job description
   */
  extractSoftSkills(text) {
    const softSkills = [
      'communication', 'leadership', 'teamwork', 'collaboration',
      'problem solving', 'critical thinking', 'adaptability',
      'agile', 'scrum', 'jira', 'confluence',
    ];
    
    const lowerText = text.toLowerCase();
    return softSkills.filter(s => lowerText.replace(/[^a-z\s]/g, '').includes(s.replace(' ', '')));
  }
  
  /**
   * Extract keywords for ATS matching with ranking
   */
  extractKeywords(text) {
    // Extract meaningful keywords (4+ letters)
    const words = text.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || [];
    
    // Filter out stop words
    const filtered = words.filter(w => !STOP_WORDS.has(w));
    
    // Rank keywords by importance
    const ranked = this.rankKeywords(filtered, text);
    
    // Return top keywords
    return [...new Set(ranked.map(r => r.keyword))];
  }
  
  /**
   * Rank keywords by importance in the job description
   */
  rankKeywords(keywords, text) {
    const lowerText = text.toLowerCase();
    
    return keywords.map(keyword => {
      let importance = 1;
      
      // Higher importance if in title/headline
      if (lowerText.startsWith(keyword)) importance += 3;
      
      // Higher importance if preceded by importance indicators
      const beforeKeyword = lowerText.substring(Math.max(0, lowerText.indexOf(keyword) - 50));
      if (/(?:required|must|essential|key|core)\s+(?:skill|technology|experience)?[:\s]*$/i.test(beforeKeyword)) {
        importance += 3;
      }
      
      // Higher importance if appears multiple times
      const occurrences = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      importance += Math.min(occurrences, 5);
      
      // Higher importance for technical terms
      if (ALL_SKILLS.some(s => s.includes(keyword) || keyword.includes(s))) {
        importance += 2;
      }
      
      return { keyword, importance };
    }).sort((a, b) => b.importance - a.importance);
  }
}