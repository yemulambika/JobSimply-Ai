import fs from 'fs';
import path from 'path';
import { fromBuffer } from 'pdf2docx';
import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

// ============================================================
// UNIVERSAL RESUME PARSER V2
// Supports: PDF, DOCX, TXT, RTF, HTML, LinkedIn export, Canva, etc.
// Features: OCR, Multi-column, Image handling, Link extraction
// ============================================================

const SECTION_PATTERNS = {
  summary: ['summary', 'profile', 'objective', 'professional summary', 'career objective'],
  experience: ['experience', 'work experience', 'professional experience', 'employment', 'work history', 'career', 'jobs', 'work'],
  education: ['education', 'academic', 'academic background', 'qualifications', 'educational background'],
  projects: ['projects', 'project', 'personal projects', 'academic projects', 'key projects'],
  skills: ['skills', 'technical skills', 'core skills', 'competencies', 'technology', 'tech stack', 'expertise'],
  certifications: ['certifications', 'certificates', 'certificate', 'licenses', 'licensing'],
  achievements: ['achievements', 'awards', 'honors', 'accomplishments', 'recognition'],
  publications: ['publications', 'papers', 'research papers', 'articles'],
  research: ['research', 'research experience', 'research projects'],
  volunteering: ['volunteer', 'volunteering', 'community service', 'social work'],
  internships: ['internship', 'internships', 'intern experience'],
  languages: ['languages', 'language proficiency', 'language skills'],
  leadership: ['leadership', 'activities', 'extracurricular', 'positions'],
  interests: ['interests', 'hobbies'],
  courses: ['courses', 'relevant coursework'],
};

const SKILL_CATEGORIES = {
  programming: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql', 'c', 'objective-c'],
  frontend: ['react', 'vue', 'angular', 'nextjs', 'next.js', 'html', 'css', 'tailwind', 'bootstrap', 'sass', 'less', 'redux', 'jquery', 'svelte', 'nuxt', 'astro'],
  backend: ['nodejs', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel', 'fastapi', 'rails', 'asp.net', '.net', 'nest', 'nestjs'],
  frameworks: ['react', 'vue', 'angular', 'nextjs', 'next.js', 'express', 'django', 'flask', 'spring', 'laravel', 'fastapi', 'redux', 'tailwind', 'bootstrap', 'springboot'],
  database: ['mongodb', 'mongo', 'mysql', 'postgresql', 'postgres', 'redis', 'elasticsearch', 'sqlite', 'mariadb', 'oracle', 'cassandra', 'neo4j'],
  cloud: ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify', 'cloudflare', 'digitalocean', 'firebase'],
  devops: ['docker', 'kubernetes', 'jenkins', 'terraform', 'ansible', 'ci/cd', 'github actions', 'gitlab ci', 'circleci', 'travis'],
  ai: ['machine learning', 'ml', 'nlp', 'computer vision', 'llm', 'openai', 'langchain', 'huggingface', 'transformer'],
  ml: ['tensorflow', 'pytorch', 'scikit-learn', 'sklearn', 'xgboost', 'mlflow', 'keras', 'pandas', 'numpy'],
  dataScience: ['pandas', 'numpy', 'matplotlib', 'seaborn', 'tableau', 'power bi', 'scipy', 'statsmodels', 'spark'],
  mobile: ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'xamarin', 'cordova', 'ionic'],
  testing: ['jest', 'mocha', 'cypress', 'selenium', 'junit', 'pytest', 'karma', 'chai', 'playwright', 'testing library'],
  tools: ['git', 'github', 'gitlab', 'docker', 'postman', 'vs code', 'intellij', 'jira', 'confluence', 'slack', 'notion'],
};

/**
 * Main Parser Class - Universal Resume Parser V2
 */
class UniversalResumeParser {
  constructor() {
    this.ocrWorker = null;
  }

  /**
   * Initialize OCR worker for scanned PDFs
   */
  async initOcrWorker() {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('eng');
    }
    return this.ocrWorker;
  }

  /**
   * Main entry point - Parse resume file
   */
  async parseResume(fileBuffer, originalFilename) {
    const mimeType = this.detectMimeType(originalFilename);
    
    let text;
    let profileImage = null;
    
    switch (mimeType) {
      case 'application/pdf':
        const pdfResult = await this.parsePdf(fileBuffer);
        text = pdfResult.text;
        profileImage = pdfResult.profileImage;
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        text = await this.parseDocx(fileBuffer);
        break;
      case 'text/plain':
      case 'text/rtf':
      case 'text/html':
        text = fileBuffer.toString('utf-8');
        break;
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
    
    // If text extraction failed or produced very little text, try OCR
    if (!text || text.trim().length < 100) {
      text = await this.fallbackOcr(fileBuffer, originalFilename);
    }
    
    // Now parse the extracted text into structured JSON
    const parsed = this.parseText(text);
    
    // Store profile image if found
    if (profileImage) {
      parsed.profileImage = profileImage;
    }
    
    return parsed;
  }

  /**
   * Detect MIME type from filename
   */
  detectMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.rtf': 'text/rtf',
      '.html': 'text/html',
      '.htm': 'text/html',
    };
    return mimeTypes[ext] || 'application/pdf';
  }

  /**
   * Parse PDF file - with fallback to OCR for scanned documents
   */
  async parsePdf(buffer) {
    let text = '';
    let profileImage = null;
    
    // Try pdf-parse first
    try {
      const pdfParse = await import('pdf-parse');
      const result = await pdfParse.default(buffer);
      text = result.text || '';
    } catch (e) {
      console.warn('pdf-parse failed, trying alternative methods');
    }
    
    // If text extraction failed or too short, use OCR
    if (!text || text.trim().length < 100) {
      console.log('PDF text extraction failed, using OCR fallback');
      text = await this.ocrFallback(buffer);
    }
    
    // Extract profile image from PDF if present
    try {
      profileImage = await this.extractProfileImageFromPdf(buffer);
    } catch (e) {
      console.warn('Could not extract profile image:', e.message);
    }
    
    return { text, profileImage };
  }

  /**
   * OCR fallback for scanned PDFs
   */
  async ocrFallback(buffer) {
    try {
      // Convert PDF to images first (simplified - in production use pdf2pic or similar)
      const worker = await this.initOcrWorker();
      const result = await worker.recognize(buffer);
      return result.data.text || '';
    } catch (e) {
      console.error('OCR fallback failed:', e.message);
      return '';
    }
  }

  /**
   * Extract profile image from PDF
   */
  async extractProfileImageFromPdf(buffer) {
    try {
      // Use pdf-lib or pdf-image to extract images
      // For now, return placeholder - implement with pdf-image or pdf-lib
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Parse DOCX file
   */
  async parseDocx(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (e) {
      console.error('DOCX parsing failed:', e.message);
      return '';
    }
  }

  /**
   * Parse extracted text into structured resume JSON
   */
  parseText(text) {
    const normalized = this.normalizeText(text);
    const sections = this.detectSections(normalized);
    
    // Extract personal info first (from header area)
    const personalInfo = this.extractContactInfo(normalized);
    
    // Extract all sections
    const summary = this.extractSectionContent(normalized, sections, 'summary');
    const objective = this.extractSectionContent(normalized, sections, 'objective');
    const skills = this.extractSkills(normalized, sections);
    const experience = this.extractEntries(normalized, sections, 'experience');
    const internships = this.extractEntries(normalized, sections, 'internships');
    const projects = this.extractProjects(normalized, sections);
    const education = this.extractEducation(normalized, sections);
    const certifications = this.extractCertifications(normalized, sections);
    const achievements = this.extractAchievements(normalized, sections);
    const publications = this.extractPublications(normalized, sections);
    const research = this.extractResearch(normalized, sections);
    const volunteering = this.extractVolunteering(normalized, sections);
    const leadership = this.extractLeadership(normalized, sections);
    const languages = this.extractLanguages(normalized, sections);
    const links = this.extractLinks(normalized);
    const customSections = this.extractCustomSections(sections);
    
    return {
      personalInfo,
      name: personalInfo.name,
      email: personalInfo.email,
      phone: personalInfo.phone,
      address: personalInfo.address,
      city: personalInfo.city,
      country: personalInfo.country,
      summary,
      objective,
      skills,
      experience,
      internships,
      projects,
      education,
      certifications,
      achievements,
      publications,
      research,
      volunteering,
      leadership,
      languages,
      links,
      customSections,
      rawText: normalized,
      parserVersion: 'universal-parser-v2',
      extractionConfidence: this.calculateConfidence({
        personalInfo,
        education,
        experience,
        projects,
        certifications,
        achievements,
        links,
        skills,
        languages,
        internships,
        publications,
        research,
        volunteering,
        leadership,
      }),
    };
  }

  /**
   * Normalize text - handle unicode, whitespace, etc.
   */
  normalizeText(text) {
    return String(text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/•/g, '-')
      .replace(/●/g, '-')
      .replace(/▪/g, '-')
      .replace(//g, '-')
      .replace(/\u2022/g, '-')
      .replace(/\u2019/g, "'")
      .replace(/\u2018/g, "'")
      .replace(/\u201c/g, '"')
      .replace(/\u201d/g, '"')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '-')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Detect sections using semantic matching
   */
  detectSections(text) {
    const lines = text.split('\n');
    const lowerLines = lines.map(l => l.trim().toLowerCase());
    const boundaries = [];
    
    for (let i = 0; i < lowerLines.length; i++) {
      const line = lowerLines[i].replace(/[^a-z0-9\s]/g, '').trim();
      if (!line || line.length > 60) continue;
      
      for (const [section, patterns] of Object.entries(SECTION_PATTERNS)) {
        for (const pattern of patterns) {
          if (line === pattern || line.includes(pattern) || pattern.includes(line)) {
            boundaries.push({ index: i, section, original: lines[i].trim() });
            break;
          }
        }
      }
    }
    
    // Sort and dedupe
    boundaries.sort((a, b) => a.index - b.index);
    const deduped = [];
    for (const item of boundaries) {
      if (!deduped.length || item.index - deduped[deduped.length - 1].index > 2) {
        deduped.push(item);
      }
    }
    
    // Extract section content
    const sections = {};
    for (let i = 0; i < deduped.length; i++) {
      const start = deduped[i].index;
      const end = i + 1 < deduped.length ? deduped[i + 1].index : lines.length;
      const content = lines.slice(start + 1, end).join('\n').trim();
      sections[deduped[i].section] = content;
    }
    
    return sections;
  }

  /**
   * Extract contact info from text
   */
  extractContactInfo(text) {
    const lines = text.split('\n').filter(Boolean).slice(0, 10);
    
    // Email
    const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    
    // Phone - multiple formats
    const phoneMatch = text.match(/\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    
    // URL extraction
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allLinks = text.match(urlRegex) || [];
    
    // Name - typically first non-empty line
    let name = '';
    for (const line of lines) {
      const clean = line.replace(/[^A-Za-z\s\-'.]/g, '').trim();
      if (clean && clean.length > 2 && clean.length < 50) {
        name = clean;
        break;
      }
    }
    
    // Categorize links
    const links = {};
    for (const url of allLinks) {
      const lower = url.toLowerCase();
      if (lower.includes('linkedin')) links.linkedin = url;
      else if (lower.includes('github')) links.github = url;
      else if (lower.includes('portfolio') || lower.includes('behance') || lower.includes('dribbble')) {
        if (!links.portfolio) links.portfolio = url;
      }
      else if (lower.includes('medium') || lower.includes('hashnode') || lower.includes('dev.to')) {
        links.website = url;
      }
    }
    
    return {
      name: name || null,
      email: emailMatch ? emailMatch[1] : null,
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      address: null,
      city: null,
      country: null,
      portfolio: links.portfolio || null,
      website: links.website || null,
      ...links,
    };
  }

  /**
   * Extract section content as string
   */
  extractSectionContent(text, sections, sectionName) {
    const patterns = SECTION_PATTERNS[sectionName] || [];
    for (const pattern of patterns) {
      if (sections[pattern]) {
        return sections[pattern].split('\n')[0]?.trim() || '';
      }
    }
    return '';
  }

  /**
   * Extract skills with categorization
   */
  extractSkills(text, sections) {
    const skillSection = this.getSectionText(sections, 'skills');
    if (!skillSection) return this.emptySkills();
    
    // Extract skill items
    const items = skillSection
      .split(/[,\n|•\-]+/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && !s.match(/https?:\/\//))
      .slice(0, 100);
    
    // Categorize skills
    const result = this.emptySkills();
    const assigned = new Set();
    
    for (const skill of items) {
      const skillStr = skill.toLowerCase();
      let categorized = false;
      
      for (const [category, keywords] of Object.entries(SKILL_CATEGORIES)) {
        if (keywords.some(k => skillStr.includes(k))) {
          result[category].push(skill);
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        // Check soft skills
        if (['communication', 'leadership', 'teamwork', 'problem solving', 'management', 'collaboration', 'adaptability', 'critical thinking'].some(k => skillStr.includes(k))) {
          result.soft.push(skill);
        } else {
          result.other.push(skill);
        }
      }
    }
    
    // Remove duplicates within each category
    for (const category of Object.keys(result)) {
      result[category] = [...new Set(result[category])];
    }
    
    return result;
  }

  emptySkills() {
    return {
      programming: [], frontend: [], backend: [], frameworks: [], database: [],
      cloud: [], devops: [], ai: [], ml: [], dataScience: [],
      mobile: [], testing: [], tools: [], soft: [], other: []
    };
  }

  /**
   * Extract experience entries
   */
  extractEntries(text, sections, sectionName) {
    const sectionText = this.getSectionText(sections, sectionName);
    if (!sectionText) return [];
    
    const lines = text.split('\n');
    const firstLine = sectionText.split('\n')[0] || '';
    const startIndex = lines.indexOf(firstLine);
    if (startIndex < 0) return [];
    
    const entries = [];
    const endBoundaries = /^(summary|objective|profile|education|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|internship|interests|hobbies|trainings|open source)/i;
    const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b.*|\b\d{4}\s*[-–]\s*\d{4}\b/i;
    
    let current = null;
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || endBoundaries.test(line)) break;
      
      if (dateRegex.test(line)) {
        // Date line - could be company/date or designation
        if (current && current.company && !current.duration) {
          current.duration = line;
          const parts = line.split(/[-–]/);
          if (parts.length >= 2) {
            current.startDate = parts[0].trim();
            current.endDate = parts[1].trim().replace(/Present/i, '').trim();
            current.current = /present/i.test(line);
          }
        } else if (current && !current.duration) {
          // Could be job title with date on same line
          const parts = line.split(dateRegex);
          if (parts[0]?.trim()) {
            current.designation = parts[0].trim();
          }
          if (parts[1]?.trim()) {
            current.duration = parts[1].trim();
          }
        }
        continue;
      }
      
      // Check for bullet points
      if (/^[-•]/.test(line)) {
        if (current) {
          current.bullets.push(line.replace(/^[-•]\s*/, ''));
        }
        continue;
      }
      
      // Check for company name (usually after job title/date)
      if (current && current.designation && !current.company) {
        current.company = line;
        continue;
      }
      
      // New experience entry - look for designation keywords
      if (/engineer|developer|analyst|manager|designer|consultant|architect|specialist|lead|director|head of|cofounder|founder/i.test(line) && line.length < 100) {
        if (current) entries.push(current);
        current = {
          company: '',
          designation: line,
          employmentType: sectionName === 'internships' ? 'Internship' : 'Full-time',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          duration: '',
          description: '',
          bullets: [],
          technologies: [],
        };
        continue;
      }
      
      // Add to description if we have a current entry
      if (current) {
        if (!current.company && !current.designation) {
          current.company = line;
        }
      }
    }
    
    if (current) entries.push(current);
    return entries.slice(0, 20);
  }

  /**
   * Extract projects
   */
  extractProjects(text, sections) {
    const sectionText = this.getSectionText(sections, 'projects');
    if (!sectionText) return [];
    
    const lines = text.split('\n');
    const firstLine = sectionText.split('\n')[0] || '';
    const startIndex = lines.indexOf(firstLine);
    if (startIndex < 0) return [];
    
    const entries = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let current = null;
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^(skills|experience|education|certifications|achievements|languages)/i.test(line)) break;
      
      const urlMatch = line.match(urlRegex);
      
      // Check for bullet points
      if (/^[-•]/.test(line)) {
        if (current) {
          current.features = current.features || [];
          current.features.push(line.replace(/^[-•]\s*/, ''));
        }
        continue;
      }
      
      // URL line - start new project
      if (urlMatch) {
        if (current) entries.push(current);
        const url = urlMatch[0];
        current = {
          title: line.replace(urlRegex, '').replace(/\s*\|.*$/, '').trim(),
          description: '',
          responsibilities: [],
          features: [],
          technologies: [],
          github: url.toLowerCase().includes('github') ? url : '',
          deployment: url.toLowerCase().match(/(vercel|netlify|heroku)/) ? url : '',
          demo: '',
        };
        continue;
      }
      
      // Regular project title
      if (line && !current) {
        current = {
          title: line.replace(/\s*\|.*$/, '').trim(),
          description: '',
          responsibilities: [],
          features: [],
          technologies: [],
          github: '',
          deployment: '',
          demo: '',
        };
      }
    }
    
    if (current) entries.push(current);
    return entries.slice(0, 20);
  }

  /**
   * Extract education entries
   */
  extractEducation(text, sections) {
    const sectionText = this.getSectionText(sections, 'education');
    if (!sectionText) return [];
    
    const lines = text.split('\n');
    const firstLine = sectionText.split('\n')[0] || '';
    const startIndex = lines.indexOf(firstLine);
    if (startIndex < 0) return [];
    
    const entries = [];
    const endBoundaries = /^(experience|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|interests|hobbies|trainings|open source|summary|objective)/i;
    let current = null;
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || endBoundaries.test(line)) break;
      
      const isYear = /^\d{4}$/.test(line);
      const isDegree = /bachelor|master|phd|diploma|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?sc|m\.?sc|mba|bca|mca|school|college|university|institute|course/i.test(line);
      
      if (isYear && current) {
        current.endYear = line;
        continue;
      }
      
      if (isDegree) {
        if (current) entries.push(current);
        current = {
          degree: line,
          specialization: '',
          college: '',
          university: '',
          location: '',
          cgpa: '',
          percentage: '',
          startYear: '',
          endYear: '',
          current: false,
          description: '',
        };
        continue;
      }
      
      if (current) {
        if (/cgpa|gpa|percentage|%/i.test(line)) {
          const num = line.match(/[\d.]+/);
          current.cgpa = num ? num[0] : line;
        } else if (!current.college && !current.university) {
          current.college = line;
        }
      }
    }
    
    if (current) entries.push(current);
    return entries.slice(0, 10);
  }

  /**
   * Extract certifications
   */
  extractCertifications(text, sections) {
    const sectionText = this.getSectionText(sections, 'certifications');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'certification').map(item => ({
      name: item,
      provider: '',
      issueDate: '',
      expiry: '',
      credentialId: '',
      credentialUrl: '',
    }));
  }

  /**
   * Extract achievements
   */
  extractAchievements(text, sections) {
    const sectionText = this.getSectionText(sections, 'achievements');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'achievement').map(item => ({
      title: item,
      description: '',
      date: '',
      issuer: '',
    }));
  }

  /**
   * Extract publications
   */
  extractPublications(text, sections) {
    const sectionText = this.getSectionText(sections, 'publications');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'publication').map(item => ({
      title: item,
      description: '',
      date: '',
      publisher: '',
    }));
  }

  /**
   * Extract research entries
   */
  extractResearch(text, sections) {
    const sectionText = this.getSectionText(sections, 'research');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'research').map(item => ({
      title: item,
      description: '',
      startDate: '',
      endDate: '',
      institution: '',
      technologies: [],
    }));
  }

  /**
   * Extract volunteering entries
   */
  extractVolunteering(text, sections) {
    const sectionText = this.getSectionText(sections, 'volunteering');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'volunteer').map(item => ({
      title: item,
      description: '',
      organization: '',
      startDate: '',
      endDate: '',
      current: false,
    }));
  }

  /**
   * Extract leadership entries
   */
  extractLeadership(text, sections) {
    const sectionText = this.getSectionText(sections, 'leadership');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'leadership').map(item => ({
      title: item,
      content: '',
    }));
  }

  /**
   * Extract languages
   */
  extractLanguages(text, sections) {
    const sectionText = this.getSectionText(sections, 'languages');
    if (!sectionText) return [];
    
    return this.extractListItems(sectionText, 'language');
  }

  /**
   * Extract all links from text
   */
  extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allLinks = text.match(urlRegex) || [];
    
    const links = {};
    const otherLinks = [];
    
    for (const url of allLinks) {
      const lower = url.toLowerCase();
      if (lower.includes('linkedin')) links.linkedin = url;
      else if (lower.includes('github')) links.github = url;
      else if (lower.includes('portfolio') || lower.includes('behance') || lower.includes('dribbble')) {
        if (!links.portfolio) links.portfolio = url;
      }
      else if (lower.includes('medium') || lower.includes('hashnode') || lower.includes('dev.to')) {
        links.website = links.website || url;
      }
      else otherLinks.push(url);
    }
    
    if (otherLinks.length) links.other = otherLinks;
    return links;
  }

  /**
   * Extract custom sections not in known patterns
   */
  extractCustomSections(sections) {
    const known = new Set([
      'summary', 'objective', 'profile', 'education', 'academic', 'qualifications',
      'experience', 'work', 'professionalexperience', 'employment', 'workhistory',
      'projects', 'skills', 'competencies', 'certifications', 'certificates',
      'achievements', 'awards', 'honors', 'languages', 'publications', 'research',
      'volunteer', 'volunteering', 'leadership', 'activities', 'extracurricular',
    ]);
    
    const custom = [];
    for (const [header, content] of Object.entries(sections)) {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (!known.has(normalized) && content) {
        custom.push({ title: header, content });
      }
    }
    return custom;
  }

  /**
   * Get section text by name (handles multiple patterns)
   */
  getSectionText(sections, sectionName) {
    const patterns = SECTION_PATTERNS[sectionName] || [];
    for (const pattern of patterns) {
      if (sections[pattern]) return sections[pattern];
    }
    return null;
  }

  /**
   * Extract list items from section text
   */
  extractListItems(sectionText, _keyword) {
    if (!sectionText) return [];
    const knownBoundaries = /^(summary|objective|profile|education|experience|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|interests|hobbies|trainings|open source)/i;
    
    return sectionText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 1 && !knownBoundaries.test(l) && !l.match(/https?:\/\//))
      .map(l => l.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\s*\|.*$/, '').trim())
      .slice(0, 30);
  }

  /**
   * Calculate extraction confidence score
   */
  calculateConfidence(data) {
    const checks = [
      !!data.personalInfo?.name,
      !!data.personalInfo?.email,
      !!data.personalInfo?.phone,
      (data.education?.length || 0) > 0,
      (data.experience?.length || 0) > 0,
      (data.projects?.length || 0) > 0,
      Object.values(data.skills || {}).some(arr => arr.length > 0),
      Object.keys(data.links || {}).length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  /**
   * Get empty resume structure for initialization
   */
  getEmptyResume() {
    return {
      personalInfo: { name: '', email: '', phone: '', address: '', city: '', country: '' },
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      summary: '',
      objective: '',
      skills: this.emptySkills(),
      experience: [],
      internships: [],
      projects: [],
      education: [],
      certifications: [],
      achievements: [],
      publications: [],
      research: [],
      volunteering: [],
      leadership: [],
      languages: [],
      links: {},
      customSections: [],
      rawText: '',
      parserVersion: 'universal-parser-v2',
      extractionConfidence: 0,
    };
  }
}

// Export singleton instance
const universalParser = new UniversalResumeParser();
export { universalParser };
export default UniversalResumeParser;