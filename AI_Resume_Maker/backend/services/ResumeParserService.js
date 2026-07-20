import { PDFParse } from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

class ResumeParserService {
  async extractTextFromPdf(filePathOrBuffer) {
    let extractedText = '';
    const errors = [];

    try {
      const parser = new PDFParse({ data: filePathOrBuffer });
      const textResult = await parser.getText({ first: 1, last: 999 });
      extractedText = textResult.text || textResult.join?.('') || '';
      await parser.destroy();
      if (extractedText.trim().length > 100) return extractedText;
    } catch (error) {
      errors.push(`pdf-parse: ${error.message}`);
    }

    try {
      const loadingTask = pdfjsLib.getDocument(filePathOrBuffer);
      const pdf = await loadingTask.promise;
      extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((item) => item.str).join(' ');
      }
      if (extractedText.trim().length > 100) return extractedText;
    } catch (error) {
      errors.push(`pdfjs-dist: ${error.message}`);
    }

    throw new Error(`PDF extraction failed: ${errors.join(' | ')}`);
  }

  parseResumeText(rawText = '') {
    const normalized = this.normalizeText(rawText);
    const sections = this.detectSections(normalized);
    const personalInfo = this.extractContactInfo(normalized);

    const summary = this.extractSummary(normalized, sections.summary || sections.profile || sections.objective);
    const objective = this.extractObjective(normalized, sections.objective);
    const education = this.extractEducation(normalized, sections.education || sections.academic || sections.qualifications);
    const experience = this.extractExperience(normalized, sections.experience || sections['work experience'] || sections.employment || sections['work history'] || sections['professional experience']);
    const internships = this.extractExperience(normalized, sections.internships || sections.internship, 'internship');
    const projects = this.extractProjects(normalized, sections.projects || sections['personal projects'] || sections['academic projects']);
    const certifications = this.extractCertifications(normalized, sections.certifications || sections.certificates || sections.certificate || sections.licenses);
    const achievements = this.extractAchievements(normalized, sections.achievements || sections.awards || sections.honors);
    const publications = this.extractPublications(normalized, sections.publications);
    const research = this.extractResearch(normalized, sections.research || sections['research experience']);
    const volunteering = this.extractVolunteering(normalized, sections.volunteering || sections.volunteer || sections['community service']);
    const leadership = this.extractLeadership(normalized, sections.leadership || sections.activities || sections.extracurricular);
    const languages = this.extractLanguages(normalized, sections.languages || sections['language proficiency']);
    const skills = this.extractSkills(normalized, sections.skills || sections.technical || sections.competencies || sections['core skills']);
    const links = this.extractLinks(normalized);
    const customSections = this.extractCustomSections(normalized, sections);

    const result = {
      personalInfo,
      name: personalInfo.name,
      email: personalInfo.email,
      phone: personalInfo.phone,
      address: personalInfo.address,
      city: personalInfo.city,
      country: personalInfo.country,
      summary,
      objective,
      education,
      experience,
      internships,
      projects,
      certifications,
      achievements,
      publications,
      research,
      volunteering,
      leadership,
      languages,
      skills,
      links,
      customSections,
      rawText: normalized,
      parserVersion: 'ats-parser-v2',
      extractionConfidence: this.calculateConfidence({
        personalInfo, education, experience, projects, certifications, achievements, links, skills, languages, internships, publications, research, volunteering, leadership,
      }),
    };

    return result;
  }

  normalizeText(text = '') {
    const str = String(text || '');
    return str
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

  detectSections(text) {
    const headingPatterns = [
      'summary', 'objective', 'profile',
      'education', 'academic background', 'academic', 'qualifications',
      'experience', 'professional experience', 'employment', 'work history', 'work experience',
      'projects', 'personal projects', 'academic projects',
      'skills', 'technical skills', 'core skills', 'competencies',
      'certifications', 'certificates', 'license', 'licenses',
      'achievements', 'awards', 'honors',
      'languages', 'language proficiency',
      'publications', 'research', 'research experience',
      'volunteer', 'volunteering', 'community service',
      'leadership', 'activities', 'extracurricular',
      'open source', 'trainings', 'training', 'internships', 'internship',
      'hobbies', 'interests', 'patents', 'presentations', 'hackathons',
    ];

    const lines = text.split('\n');
    const lowerLines = lines.map((l) => l.trim().toLowerCase());
    const boundaries = [];

    for (let i = 0; i < lowerLines.length; i++) {
      const line = lowerLines[i];
      if (!line || line.length > 80) continue;
      for (const pattern of headingPatterns) {
        if (line === pattern || line === pattern.replace(/s$/, '')) {
          boundaries.push({ index: i, header: pattern, original: lines[i].trim() });
          break;
        }
      }
    }

    boundaries.sort((a, b) => a.index - b.index);

    const deduped = [];
    for (const item of boundaries) {
      if (!deduped.length || item.index - deduped[deduped.length - 1].index > 2) {
        deduped.push(item);
      }
    }

    const sections = {};
    for (let i = 0; i < deduped.length; i++) {
      const start = deduped[i].index;
      const end = i + 1 < deduped.length ? deduped[i + 1].index : lines.length;
      const header = deduped[i].header;
      const content = lines.slice(start + 1, end).join('\n').trim();
      sections[header] = content;
    }

    return sections;
  }

  extractContactInfo(text) {
    // Extract phone - match Indian format +91-9765679908 or similar
    const phoneMatch = text.match(/\+?\d{2,4}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/);
    
    // Extract email - make sure we don't capture partial text before it
    // Use word boundary to ensure clean email extraction
    const emailMatch = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    
    const lines = text.split('\n').filter(Boolean);
    // Extract name - first line should be the name
    const name = (lines[0] || '').replace(/[^A-Za-z\s\-'.]+/g, '').trim();

    // Extract city from the first block (before phone/email)
    let city = null;
    const firstBlock = lines.slice(0, 2).join(' ');
    // Look for city pattern like "Pune" or "Mumbai" at start
    const cityMatch = firstBlock.match(/\b(Pune|Mumbai|Bangalore|Delhi|Hyderabad|Chennai|Kolkata|Ahmedabad|Surat|Nagpur|Nashik)\b/i);
    if (cityMatch) {
      city = cityMatch[1];
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allLinks = text.match(urlRegex) || [];

    const links = {};
    const otherLinks = [];
    for (const url of allLinks) {
      const lower = url.toLowerCase();
      if (lower.includes('github')) links.github = url;
      else if (lower.includes('linkedin')) links.linkedin = url;
      else if (lower.includes('gfg') || lower.includes('geeksforgeeks')) links.gfg = url;
      else if (lower.includes('scaler')) links.scaler = url;
      else if (lower.includes('medium')) links.medium = url;
      else if (lower.includes('hashnode')) links.hashnode = url;
      else if (lower.includes('dev.to')) links.devto = url;
      else if (lower.includes('kaggle')) links.kaggle = url;
      else if (lower.includes('stackoverflow')) links.stackoverflow = url;
      else if (lower.includes('leetcode')) links.leetcode = url;
      else if (lower.includes('codeforces')) links.codeforces = url;
      else if (lower.includes('codechef')) links.codechef = url;
      else if (lower.includes('behance')) links.behance = url;
      else if (lower.includes('dribbble')) links.dribbble = url;
      else if (lower.includes('gitlab')) links.gitlab = url;
      else if (lower.includes('bitbucket')) links.bitbucket = url;
      else if (lower.includes('twitter') || lower.includes('x.com')) links.twitter = url;
      else otherLinks.push(url);
    }
    if (otherLinks.length) links.other = otherLinks;

    return {
      name: name || null,
      email: emailMatch ? (emailMatch[1] || emailMatch[0]) : null,
      phone: phoneMatch ? phoneMatch[0].trim() : null,
      address: null,
      city: city,
      country: null,
      portfolio: null,
      website: null,
      ...links,
    };
  }

  extractSummary(text, sectionText) {
    if (!sectionText) return '';
    const cleaned = sectionText.replace(/^(summary|profile|objective)[:\s]*/i, '').trim();
    return cleaned.split('\n')[0]?.trim() || cleaned.trim();
  }

  extractObjective(text, sectionText) {
    if (!sectionText) return '';
    return sectionText.replace(/^objective[:\s]*/i, '').trim();
  }

  extractEducation(text, sectionText) {
    if (!sectionText) return [];
    const lines = text.split('\n');
    const firstLine = sectionText.split('\n')[0] || '';
    const startIndex = lines.indexOf(firstLine);
    if (startIndex < 0) return [];

    const entries = [];
    const endBoundaries = /^(experience|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|hobbies|interests|trainings|internships|open source|summary|objective|profile)$/i;

    let current = null;
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || endBoundaries.test(line)) break;

      const degreeLike = /degree|bachelor|master|phd|diploma|b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?sc|m\.?sc|mba|bca|mca|school|college|university|institute/i.test(line);
      
      // Check if this is a year line (like "2024")
      const isYear = /^\d{4}$/.test(line);
      
      // Check if this is a specialization line
      const isSpecialization = /specialization|focus|major/i.test(line);
      
      if (degreeLike || isSpecialization) {
        if (current) entries.push(current);
        current = {
          degree: isSpecialization ? '' : line,
          specialization: isSpecialization ? line.replace(/specialization\s*:?\s*/i, '').replace(/\s*\(.*?\)\s*$/, '') : '',
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
        if (isSpecialization) {
          current.degree = '';
        }
        continue;
      }

      if (current) {
        if (/cgpa|gpa|percentage|%/i.test(line.toLowerCase())) {
          const num = line.match(/[\d.]+/);
          current.cgpa = num ? num[0] : line;
          continue;
        }
        if (isYear) {
          current.endYear = line;
          continue;
        }
        // First non-degree line after degree is college/university
        if (!current.college && !current.university) {
          current.college = line;
        }
      }
    }
    if (current) entries.push(current);
    return entries;
  }

  extractExperience(text, sectionText, mode = 'experience') {
    if (!sectionText) return [];
    const lines = text.split('\n');
    const firstLine = sectionText.split('\n')[0] || '';
    const startIndex = lines.indexOf(firstLine);
    if (startIndex < 0) return [];

    const entries = [];
    const endBoundaries = /^(education|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|hobbies|interests|trainings|internships|open source|summary|objective|profile)$/i;
    // More flexible date regex - matches "Aug 2024 - Aug 2025", "Jan 2023 - Present", etc.
    const dateRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b.*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present)\b|\b\d{4}\s*[-–]\s*\d{4}\b/i;

    let current = null;
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || endBoundaries.test(line)) break;

      // Check if this is a date line
      const isDateLine = dateRegex.test(line);
      
      // Check if line has job-related keywords (designation) - with word boundaries
      // Also require the line to be relatively short (designations are typically short)
      const isDesignation = /\b(intern|engineer|developer|analyst|consultant|manager|lead|architect|designer|specialist|administrator|coordinator|fullstack|full.stack|full-stack)\b/i.test(line) && !isDateLine && line.length < 100;

      if (isDesignation) {
        if (current) entries.push(current);
        current = {
          company: '',
          designation: line,
          employmentType: mode === 'internship' ? 'Internship' : 'Full-time',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          duration: '',
          description: '',
          bullets: [],
          technologies: [],
        };
        // Check next line for date
        const nextLine = lines[i + 1]?.trim();
        const nextLineIsDate = nextLine && dateRegex.test(nextLine);
        
        if (nextLineIsDate) {
          current.duration = nextLine;
          current.startDate = nextLine.split(/[-–]/)[0].trim();
          current.endDate = nextLine.split(/[-–]/)[1]?.replace(/Present/i, '').trim() || '';
          current.current = /present/i.test(nextLine);
          i++; // Skip date line
          
          // Check line after date for company name
          const companyLine = lines[i + 1]?.trim();
          if (companyLine && !endBoundaries.test(companyLine) && !dateRegex.test(companyLine)) {
            current.company = companyLine;
            i++; // Skip company line
          }
        }
        continue;
      }

      if (/^[•\-]\s*(.*)$/.test(line)) {
        if (!current) {
          current = {
            company: '',
            designation: '',
            employmentType: mode === 'internship' ? 'Internship' : 'Full-time',
            location: '',
            startDate: '',
            current: false,
            duration: '',
            description: '',
            bullets: [],
            technologies: [],
          };
        }
        current.bullets.push(line.replace(/^[•\-]\s*/, ''));
        continue;
      }

      if (current) {
        // Only add to description if we have a current entry
        // Don't treat this as company if we already have a company
        if (!current.company && !current.designation) {
          current.company = line;
        } else {
          current.description = current.description ? `${current.description} ${line}` : line;
        }
      }
    }
    if (current) entries.push(current);
    return entries.slice(0, 20);
  }

  extractProjects(text, sectionText) {
    if (!sectionText) return [];
    const lines = text.split('\n');
    const firstLine = sectionText.split('\n')[0] || '';
    const startIndex = lines.indexOf(firstLine);
    if (startIndex < 0) return [];

    const entries = [];
    let current = null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^(education|experience|skills|certifications|achievements|languages|publications|research|volunteer|leadership|hobbies|interests|trainings|internships|open source|summary|objective|profile|academics?)$/i.test(line)) break;

      // Check if this is a URL line (indicating a project)
      const urlMatch = line.match(urlRegex);
      
      // If we find a URL and have a current project, save previous project
      if (urlMatch && current) {
        entries.push(current);
        current = null;
      }

      // Check if this is a bullet point
      if (/^[•\-]\s*(.*)$/.test(line)) {
        if (!current) {
          current = {
            title: 'Project',
            description: '',
            bullets: [],
            technologies: [],
            github: '',
            deployment: '',
            demo: '',
            features: [],
          };
        }
        current.bullets.push(line.replace(/^[•\-]\s*/, ''));
        continue;
      }

      // If this is a URL, start a new project
      if (urlMatch && !current) {
        const url = urlMatch[0];
        const lowerUrl = url.toLowerCase();
        current = {
          title: line.replace(urlRegex, '').replace(/\s*\|.*$/, '').trim(), // Remove URL and trailing pipe content
          description: '',
          bullets: [],
          technologies: [],
          github: lowerUrl.includes('github') ? url : '',
          deployment: (lowerUrl.includes('vercel') || lowerUrl.includes('netlify') || lowerUrl.includes('heroku')) ? url : '',
          demo: '',
          features: [],
        };
        continue;
      }

      // If this looks like a project title (no URL, no bullet) and no current project
      if (line && !current && !urlMatch) {
        current = {
          title: line.replace(/\s*\|.*$/, '').trim(), // Remove trailing pipe content
          description: '',
          bullets: [],
          technologies: [],
          github: '',
          deployment: '',
          demo: '',
          features: [],
        };
      } else if (current && line && !urlMatch) {
        // Add to description
        current.description = current.description ? `${current.description} ${line}` : line;
      }
    }
    
    if (current) {
      entries.push(current);
    }
    return entries;
  }

  enrichProjectLinks(project, fullText) {
    const urls = fullText.match(/https?:\/\/[^\s]+/g) || [];
    for (const url of urls) {
      const lower = url.toLowerCase();
      if (lower.includes('github') && !project.github) project.github = url;
      else if ((lower.includes('vercel') || lower.includes('netlify') || lower.includes('heroku')) && !project.deployment) project.deployment = url;
      else if (lower.includes('play.google') || lower.includes('apple.com')) project.demo = project.demo || url;
    }
  }

  extractCertifications(text, sectionText) {
    if (!sectionText) return [];
    const items = this.extractListSection(text, sectionText, ['certification', 'certificate', 'certified', 'license']);
    return items.map((name) => {
      const parts = name.split(' - ');
      const certName = parts[0] || name;
      const provider = parts[1] || '';
      const dates = (parts[2] || '').match(/\d{4}/g) || [];
      return {
        name: certName,
        provider,
        issueDate: dates[0] || '',
        expiry: dates[1] || '',
        credentialId: '',
        credentialUrl: '',
      };
    });
  }

  extractAchievements(text, sectionText) {
    if (!sectionText) return [];
    const items = this.extractListSection(text, sectionText, ['achievement', 'award', 'honor']);
    return items.map((title) => ({ title, description: '', date: '', issuer: '' }));
  }

  extractPublications(text, sectionText) {
    if (!sectionText) return [];
    return this.extractListSection(text, sectionText, ['publication', 'paper', 'journal']);
  }

  extractResearch(text, sectionText) {
    if (!sectionText) return [];
    return this.extractListSection(text, sectionText, ['research']);
  }

  extractVolunteering(text, sectionText) {
    if (!sectionText) return [];
    const items = this.extractListSection(text, sectionText, ['volunteer', 'community']);
    return items.map((title) => ({ title, description: '', organization: '', startDate: '', endDate: '', current: false }));
  }

  extractLeadership(text, sectionText) {
    if (!sectionText) return [];
    return this.extractListSection(text, sectionText, ['leadership', 'activities', 'extracurricular']);
  }

  extractLanguages(text, sectionText) {
    if (!sectionText) return [];
    const items = sectionText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^(education|experience|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|hobbies|interests|trainings|internships|open source|summary|objective|profile)$/i.test(l))
      .map((l) => l.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '').trim());
    return items.slice(0, 20);
  }

  extractSkills(text, sectionText) {
    if (!sectionText) return { programming: [], frontend: [], backend: [], frameworks: [], database: [], cloud: [], devops: [], ai: [], ml: [], dataScience: [], mobile: [], testing: [], tools: [], soft: [], other: [] };
    const cleaned = sectionText.replace(/^(skills|technical skills|core skills|competencies)[:\s]*/i, '').trim();
    const items = cleaned.split(/[,\n|•\-]+/).map((s) => s.trim()).filter((s) => s.length > 1 && !s.includes('http'));
    const unique = [...new Set(items)].slice(0, 80);

    const categories = {
      programming: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql'],
      frontend: ['react', 'vue', 'angular', 'nextjs', 'html', 'css', 'tailwind', 'bootstrap', 'sass', 'redux', 'jquery'],
      backend: ['nodejs', 'express', 'django', 'flask', 'spring', 'laravel', 'fastapi'],
      frameworks: ['react', 'vue', 'angular', 'nextjs', 'express', 'django', 'spring', 'laravel', 'flask', 'fastapi', 'redux', 'tailwind'],
      database: ['mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'sql'],
      cloud: ['aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify'],
      devops: ['docker', 'kubernetes', 'jenkins', 'terraform', 'ansible', 'ci/cd', 'github actions'],
      ai: ['machine learning', 'nlp', 'computer vision', 'llm', 'openai'],
      ml: ['tensorflow', 'pytorch', 'scikit-learn', 'xgboost', 'mlflow'],
      dataScience: ['pandas', 'numpy', 'matplotlib', 'seaborn', 'tableau', 'power bi'],
      mobile: ['react native', 'flutter', 'swift', 'kotlin'],
      testing: ['jest', 'mocha', 'cypress', 'selenium', 'junit'],
      tools: ['git', 'github', 'gitlab', 'docker', 'postman', 'vs code', 'jira'],
    };

    const result = {};
    const assigned = new Set();
    for (const [category, keywords] of Object.entries(categories)) {
      result[category] = unique.filter((skill) => {
        const lower = skill.toLowerCase();
        return keywords.some((k) => lower.includes(k));
      });
      result[category].forEach((s) => assigned.add(s));
    }
    result.soft = unique.filter((s) => /communication|leadership|teamwork|problem solving|management/.test(s.toLowerCase()));
    const softAssigned = Array.from(result.soft);
    softAssigned.forEach((s) => assigned.delete(s));
    result.other = unique.filter((s) => !assigned.has(s));

    return result;
  }

  extractCustomSections(text, detectedSections) {
    const known = new Set([
      'summary', 'objective', 'profile', 'education', 'academic', 'qualifications', 'experience', 'workexperience', 'professionalexperience', 'employment', 'workhistory',
      'projects', 'projectexperience', 'skills', 'technicalskills', 'competencies', 'certifications', 'certificates', 'certificate',
      'achievements', 'accomplishments', 'awards', 'languages', 'languageproficiency', 'publications', 'research', 'volunteer', 'volunteering',
      'leadership', 'activities', 'extracurricular', 'opensource', 'trainings', 'training', 'internships', 'hobbies', 'interests', 'patents', 'presentations', 'hackathons',
    ]);

    const custom = [];
    for (const [header, content] of Object.entries(detectedSections)) {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (!known.has(normalizedHeader) && content) {
        custom.push({ title: header, content });
      }
    }
    return custom;
  }

  extractLinks(text) {
    const links = {};
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allLinks = text.match(urlRegex) || [];
    const otherLinks = [];

    for (const url of allLinks) {
      const lower = url.toLowerCase();
      if (lower.includes('github')) links.github = url;
      else if (lower.includes('linkedin')) links.linkedin = url;
      else if (lower.includes('gfg') || lower.includes('geeksforgeeks')) links.gfg = url;
      else if (lower.includes('scaler')) links.scaler = url;
      else if (lower.includes('medium')) links.medium = url;
      else if (lower.includes('hashnode')) links.hashnode = url;
      else if (lower.includes('dev.to')) links.devto = url;
      else if (lower.includes('kaggle')) links.kaggle = url;
      else if (lower.includes('stackoverflow')) links.stackoverflow = url;
      else if (lower.includes('leetcode')) links.leetcode = url;
      else if (lower.includes('codeforces')) links.codeforces = url;
      else if (lower.includes('codechef')) links.codechef = url;
      else if (lower.includes('behance')) links.behance = url;
      else if (lower.includes('dribbble')) links.dribbble = url;
      else if (lower.includes('gitlab')) links.gitlab = url;
      else if (lower.includes('bitbucket')) links.bitbucket = url;
      else if (lower.includes('twitter') || lower.includes('x.com')) links.twitter = url;
      else otherLinks.push(url);
    }
    if (otherLinks.length) links.other = otherLinks;
    return links;
  }

  calculateConfidence(data) {
    const checks = [
      !!data.personalInfo?.name,
      !!data.personalInfo?.email,
      !!data.personalInfo?.phone,
      (data.education?.length || 0) > 0,
      (data.experience?.length || 0) > 0,
      (data.projects?.length || 0) > 0,
      (data.certifications?.length || 0) > 0,
      (data.achievements?.length || 0) > 0,
      Object.keys(data.links || {}).length > 0,
      Object.values(data.skills || {}).some((arr) => Array.isArray(arr) && arr.length > 0),
      (data.languages?.length || 0) > 0,
      (data.internships?.length || 0) > 0,
      (data.publications?.length || 0) > 0,
      (data.research?.length || 0) > 0,
      (data.volunteering?.length || 0) > 0,
      (data.leadership?.length || 0) > 0,
    ];
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    return score;
  }

  extractListSection(text, sectionText, keywords) {
    if (!sectionText) return [];
    const lowerText = sectionText.toLowerCase();
    if (!keywords.some((k) => lowerText.includes(k))) return [];

    const knownBoundaries = /^(education|experience|projects|skills|certifications|achievements|languages|publications|research|volunteer|leadership|hobbies|interests|trainings|internships|open source|summary|objective|profile)$/i;
    const items = sectionText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 1 && !knownBoundaries.test(l) && !l.match(/https?:\/\//))
      .map((l) => l.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\s*\|.*$/, '').trim());

    return items.slice(0, 30);
  }
}

export const resumeParserService = new ResumeParserService();