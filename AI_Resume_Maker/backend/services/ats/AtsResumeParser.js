/**
 * ATS Resume Parser - Extracts structured data from resume text
 * Designed for compatibility with semantic matching
 */

import { normalizeSkills, categorizeSkills } from './SkillNormalizer.js';

// Section headers to look for
const SECTION_HEADERS = {
  personal: ['contact', 'personal', 'profile', 'summary'],
  summary: ['summary', 'objective', 'professional summary'],
  education: ['education', 'academic', 'qualification', 'degree'],
  experience: ['experience', 'employment', 'work history', 'professional experience'],
  projects: ['projects', 'project', 'portfolio'],
  skills: ['skills', 'technical skills', 'competencies', 'proficiencies'],
  certifications: ['certifications', 'certification', 'certificate', 'courses'],
  achievements: ['achievements', 'awards', 'accomplishments'],
};

// Contact info patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const LINKEDIN_PATTERN = /(?:linkedin\.com\/in\/|linkedin:)\s*([a-zA-Z0-9_-]+)/i;
const GITHUB_PATTERN = /(?:github\.com\/|github:)\s*([a-zA-Z0-9_-]+)/i;

// Education patterns - including B.Tech, BE, Bachelor variations
const EDUCATION_PATTERNS = [
  /bachelor(?:'s)?\s+(?:of\s+)?(science|arts|engineering|technology)?/i,
  /master(?:'s)?\s+(?:of\s+)?(science|arts|engineering|technology)?/i,
  /b\.?tech/i,
  /m\.?tech/i,
  /b\.?e/i,
  /m\.?e/i,
  /b\.?sc/i,
  /m\.?sc/i,
  /computer science/i,
  /information technology/i,
  /software engineering/i,
  /bca/i,
  /mca/i,
];

// Experience patterns (years/duration)
const EXPERIENCE_DURATION_PATTERNS = [
  /(\d+)\s*(?:-\s*(\d+))?\s*(?:years?|yrs?)/i,
  /(\d{4})\s*[-–]\s*(\d{4}|\w+)/i,
  /(\w+\s+\d{4})\s*[-–]\s*(\w+\s+\d{4}|\w+)/i,
];

export class AtsResumeParser {
  /**
   * Parse resume text into structured format
   */
  parse(text) {
    if (!text) return this.getEmptyResult();
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    return {
      personal: this.extractPersonal(lines),
      summary: this.extractSummary(lines),
      education: this.extractEducation(lines),
      experience: this.extractExperience(lines),
      projects: this.extractProjects(lines),
      skills: this.extractSkills(lines),
      certifications: this.extractCertifications(lines),
      achievements: this.extractAchievements(lines),
      rawText: text,
    };
  }
  
  getEmptyResult() {
    return {
      personal: { name: null, email: null, phone: null, location: null, linkedin: null, github: null },
      summary: '',
      education: [],
      experience: [],
      projects: [],
      skills: { languages: [], frontend: [], backend: [], databases: [], cloud: [], devops: [], ai_ml: [], tools: [], other: [] },
      certifications: [],
      achievements: [],
      rawText: '',
    };
  }
  
  /**
   * Extract personal/contact information
   */
  extractPersonal(lines) {
    const fullText = lines.join(' ');
    
    // Try to find name in first few lines
    let name = null;
    for (const line of lines.slice(0, 5)) {
      // Skip lines that are clearly not names
      if (EMAIL_PATTERN.test(line) || PHONE_PATTERN.test(line) || 
          line.toLowerCase().includes('resume') || line.toLowerCase().includes('curriculum')) {
        continue;
      }
      // Likely a name if it has 2-4 words, no numbers
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && !/\d/.test(line)) {
        name = line;
        break;
      }
    }
    
    return {
      name,
      email: this.extractField(fullText, EMAIL_PATTERN),
      phone: this.extractField(fullText, PHONE_PATTERN),
      location: this.extractLocation(fullText),
      linkedin: this.extractField(fullText, LINKEDIN_PATTERN),
      github: this.extractField(fullText, GITHUB_PATTERN),
    };
  }
  
  extractField(text, pattern) {
    const match = text.match(pattern);
    return match ? match[0] : null;
  }
  
  extractLocation(text) {
    // Simple location extraction - look for common patterns
    const locationPatterns = [
      /(?:[A-Z][a-z]+,\s*[A-Z]{2})/,  // City, State
      /(?:[A-Z][a-z]+\s+[A-Z][a-z]+)/, // Two word locations
    ];
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[0].length > 5) return match[0];
    }
    return null;
  }
  
  /**
   * Extract summary/objective section
   */
  extractSummary(lines) {
    const summaryLines = this.extractSectionLines(lines, 'summary');
    return summaryLines.slice(0, 1000);
  }
  
  /**
   * Extract education section
   */
  extractEducation(lines) {
    const eduLines = this.extractSectionLines(lines, 'education');
    const education = [];
    
    // Split by empty lines or date patterns
    const entries = this.splitEntries(eduLines);
    
    for (const entry of entries) {
      const entryText = entry.toLowerCase();
      for (const pattern of EDUCATION_PATTERNS) {
        if (pattern.test(entryText)) {
          education.push({
            degree: this.extractDegree(entry),
            institution: this.extractInstitution(entry),
            year: this.extractYear(entry),
            raw: entry.substring(0, 200)
          });
          break;
        }
      }
      
      // Also check for any bachelor/master degree mentions
      if (entryText.includes('bachelor') || entryText.includes('b.tech') || entryText.includes('b.e') || entryText.includes('undergraduate')) {
        if (!education.some(e => e.degree && e.degree.toLowerCase().includes('bachelor'))) {
          education.push({
            degree: 'Bachelor',
            institution: this.extractInstitution(entry),
            year: this.extractYear(entry),
            raw: entry.substring(0, 200)
          });
        }
      }
    }
    
    return education;
  }
  
  extractDegree(text) {
    const patterns = [
      /bachelor(?:'s)?\s+(?:of\s+)?(science|arts|engineering|technology)?/i,
      /master(?:'s)?\s+(?:of\s+)?(science|arts|engineering|technology)?/i,
      /b\.?tech/i,
      /m\.?tech/i,
      /b\.?e/i,
      /m\.?e/i,
      /computer science/i,
      /information technology/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }
  
  extractInstitution(text) {
    // Look for university/college names
    const patterns = [
      /university of [a-z]+/i,
      /indian institute of technology/i,
      /indian institute of science/i,
      /national institute of technology/i,
      /[a-z]+ college/i,
      /institute of [a-z]+/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }
  
  extractYear(text) {
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : null;
  }
  
  /**
   * Extract experience section
   */
  extractExperience(lines) {
    const expLines = this.extractSectionLines(lines, 'experience');
    const experiences = [];
    
    const entries = this.splitEntries(expLines);
    
    for (const entry of entries) {
      const durationMatch = this.extractDuration(entry);
      const dates = this.extractDates(entry);
      
      experiences.push({
        company: this.extractCompany(entry),
        title: this.extractJobTitle(entry),
        duration: durationMatch,
        startDate: dates.start,
        endDate: dates.end,
        responsibilities: this.extractResponsibilities(entry),
        raw: entry.substring(0, 500)
      });
    }
    
    return experiences;
  }
  
  extractDuration(text) {
    for (const pattern of EXPERIENCE_DURATION_PATTERNS) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }
  
  extractDates(text) {
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const matches = text.match(yearPattern);
    return {
      start: matches ? matches[0] : null,
      end: matches && matches.length > 1 ? matches[matches.length - 1] : null
    };
  }
  
  extractCompany(text) {
    // Look for company name patterns
    const patterns = [
      /at\s+([A-Z][a-zA-Z\s]+)/i,
      /,\s*([A-Z][a-zA-Z\s]+)\s*$/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }
  
  extractJobTitle(text) {
    // First line is often the title
    const firstLine = text.split('\n')[0];
    if (firstLine && firstLine.length < 100) {
      return firstLine.trim();
    }
    return null;
  }
  
  extractResponsibilities(text) {
    const bullets = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('•') || line.includes('-') || line.includes('●')) {
        bullets.push(line.replace(/[•\-●]/g, '').trim());
      }
    }
    
    return bullets.length > 0 ? bullets : [];
  }
  
  /**
   * Extract projects section
   */
  extractProjects(lines) {
    const projLines = this.extractSectionLines(lines, 'projects');
    const projects = [];
    
    const entries = this.splitEntries(projLines);
    
    for (const entry of entries) {
      const techMatch = entry.match(/(?:tech|technologies?|stack):\s*([^\n]+)/i);
      const technologies = techMatch ? 
        techMatch[1].split(/[,;|]/).map(t => t.trim()).filter(Boolean) : 
        this.extractSkillsFromText(entry);
      
      projects.push({
        title: this.extractProjectTitle(entry),
        technologies,
        description: entry.substring(0, 300),
        achievements: this.extractAchievements(entry)
      });
    }
    
    return projects;
  }
  
  extractProjectTitle(text) {
    const firstLine = text.split('\n')[0];
    return firstLine && firstLine.length < 100 ? firstLine.replace(/[:•●]/g, '').trim() : null;
  }
  
  extractSkillsFromText(text) {
    // Extract technical skills from text
    const skillKeywords = [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'nodejs', 'node.js',
      'python', 'java', 'aws', 'docker', 'sql', 'mongodb', 'postgresql', 'mysql',
      'express', 'django', 'flask', 'spring', 'html', 'css', 'nextjs', 'redux'
    ];
    const found = [];
    const lowerText = text.toLowerCase();
    for (const skill of skillKeywords) {
      if (lowerText.includes(skill)) {
        found.push(skill);
      }
    }
    return found;
  }
  
  extractAchievements(text) {
    const achievements = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('award') || line.toLowerCase().includes('achievement')) {
        achievements.push(line.trim());
      }
    }
    return achievements;
  }
  
  /**
   * Extract skills section - improved to handle various formats
   */
  extractSkills(lines) {
    const skillLines = this.extractSectionLines(lines, 'skills');
    const rawSkills = this.extractSkillsFromText(skillLines);
    const normalized = normalizeSkills(rawSkills);
    return categorizeSkills(normalized);
  }
  
  /**
   * Extract certifications section
   */
  extractCertifications(lines) {
    const certLines = this.extractSectionLines(lines, 'certifications');
    return certLines
      .split(/[\n•●-]/)
      .map(l => l.trim())
      .filter(l => l.length > 5 && l.length < 200);
  }
  
  /**
   * Extract achievements section
   */
  extractAchievements(lines) {
    const achLines = this.extractSectionLines(lines, 'achievements');
    return achLines
      .split(/[\n•●-]/)
      .map(l => l.trim())
      .filter(l => l.length > 5);
  }
  
  /**
   * Find section lines between headers
   */
  extractSectionLines(lines, sectionKey) {
    const headers = SECTION_HEADERS[sectionKey] || [];
    let startIndex = -1;
    let endIndex = lines.length;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (headers.some(h => line.includes(h))) {
        startIndex = i + 1;
      } else if (startIndex > 0 && this.isSectionHeader(line)) {
        endIndex = i;
        break;
      }
    }
    
    if (startIndex === -1) return '';
    return lines.slice(startIndex, endIndex).join('\n');
  }
  
  isSectionHeader(line) {
    const allHeaders = Object.values(SECTION_HEADERS).flat();
    return allHeaders.some(h => line.includes(h));
  }
  
  /**
   * Split text into entries by empty lines
   */
  splitEntries(text) {
    if (!text) return [];
    const entries = text.split(/\n\s*\n/).filter(e => e.trim().length > 10);
    return entries;
  }
}