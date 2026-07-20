/**
 * Normalize Resume Data Structure
 * Ensures all AI providers return consistent, complete resume structure
 */

export function normalizeResumeData(data) {
  if (!data || typeof data !== 'object') {
    return getEmptyResumeStructure();
  }

  // Handle different naming conventions from different providers
  const personalInfo = data.personalInfo || {
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    address: data.address || '',
    city: data.city || '',
    country: data.country || '',
  };

  // Normalize skills - could be array or object
  const skills = normalizeSkills(data.skills);

  // Normalize experience
  const experience = normalizeArray(data.experience || data.experience || [], normalizeExperience);

  // Normalize education
  const education = normalizeArray(data.education || [], normalizeEducation);

  // Normalize projects
  const projects = normalizeArray(data.projects || [], normalizeProjects);

  // Normalize certifications
  const certifications = normalizeArray(data.certifications || data.certificates || [], normalizeCertifications);

  // Normalize links - could be object or individual fields
  const links = normalizeLinks(data.links || data);

  // Normalize custom sections
  const customSections = normalizeArray(data.customSections || [], normalizeCustomSection);

  return {
    personalInfo,
    name: personalInfo.name,
    email: personalInfo.email,
    phone: personalInfo.phone,
    address: personalInfo.address,
    city: personalInfo.city,
    country: personalInfo.country,
    summary: data.summary || data.objective || '',
    objective: data.objective || '',
    education,
    experience,
    internships: normalizeArray(data.internships || [], normalizeExperience),
    projects,
    certifications,
    achievements: normalizeArray(data.achievements || data.awards || [], (item) => typeof item === 'string' ? { title: item, description: '', date: '', issuer: '' } : item),
    publications: normalizeArray(data.publications || [], (item) => typeof item === 'string' ? { title: item, description: '' } : item),
    research: normalizeArray(data.research || [], (item) => typeof item === 'string' ? { title: item, description: '' } : item),
    volunteering: normalizeArray(data.volunteering || data.volunteer || [], (item) => typeof item === 'string' ? { title: item, description: '', organization: '', startDate: '', endDate: '', current: false } : item),
    leadership: normalizeArray(data.leadership || data.activities || [], (item) => typeof item === 'string' ? { title: item, description: '' } : item),
    languages: normalizeArray(data.languages || [], (item) => typeof item === 'string' ? item : item),
    skills,
    links,
    customSections,
    rawText: data.rawText || '',
    parserVersion: data.parserVersion || 'normalized-v1',
    extractionConfidence: data.extractionConfidence || 0,
  };
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    // If skills is a flat array, categorize them
    const categorized = {
      programming: [],
      frontend: [],
      backend: [],
      frameworks: [],
      database: [],
      cloud: [],
      devops: [],
      ai: [],
      ml: [],
      dataScience: [],
      mobile: [],
      testing: [],
      tools: [],
      soft: [],
      other: [],
    };
    
    skills.forEach(skill => {
      const skillStr = typeof skill === 'string' ? skill.toLowerCase() : (skill.name || '').toLowerCase();
      let categorized = false;
      
      // Simple categorization
      if (['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'sql'].some(k => skillStr.includes(k))) {
        categorized.programming.push(skill);
        categorized = true;
      }
      if (['react', 'vue', 'angular', 'nextjs', 'html', 'css', 'tailwind', 'bootstrap', 'sass', 'redux', 'jquery'].some(k => skillStr.includes(k))) {
        categorized.frontend.push(skill);
        categorized = true;
      }
      if (['nodejs', 'express', 'django', 'flask', 'spring', 'laravel', 'fastapi'].some(k => skillStr.includes(k))) {
        categorized.backend.push(skill);
        categorized = true;
      }
      if (['mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'sql'].some(k => skillStr.includes(k))) {
        categorized.database.push(skill);
        categorized = true;
      }
      if (['aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify'].some(k => skillStr.includes(k))) {
        categorized.cloud.push(skill);
        categorized = true;
      }
      if (['docker', 'kubernetes', 'jenkins', 'terraform', 'ansible', 'ci/cd', 'github actions'].some(k => skillStr.includes(k))) {
        categorized.devops.push(skill);
        categorized = true;
      }
      if (['machine learning', 'nlp', 'computer vision', 'llm', 'openai'].some(k => skillStr.includes(k))) {
        categorized.ai.push(skill);
        categorized = true;
      }
      if (['tensorflow', 'pytorch', 'scikit-learn', 'xgboost', 'mlflow'].some(k => skillStr.includes(k))) {
        categorized.ml.push(skill);
        categorized = true;
      }
      if (['pandas', 'numpy', 'matplotlib', 'seaborn', 'tableau', 'power bi'].some(k => skillStr.includes(k))) {
        categorized.dataScience.push(skill);
        categorized = true;
      }
      if (['react native', 'flutter', 'swift', 'kotlin'].some(k => skillStr.includes(k))) {
        categorized.mobile.push(skill);
        categorized = true;
      }
      if (['jest', 'mocha', 'cypress', 'selenium', 'junit'].some(k => skillStr.includes(k))) {
        categorized.testing.push(skill);
        categorized = true;
      }
      if (['git', 'github', 'gitlab', 'docker', 'postman', 'vs code', 'jira'].some(k => skillStr.includes(k))) {
        categorized.tools.push(skill);
        categorized = true;
      }
      if (['communication', 'leadership', 'teamwork', 'problem solving', 'management'].some(k => skillStr.includes(k))) {
        categorized.soft.push(skill);
        categorized = true;
      }
      
      if (!categorized) {
        categorized.other.push(skill);
      }
    });
    
    return categorized;
  }
  
  // If skills is already categorized, ensure all categories exist
  return {
    programming: skills.programming || [],
    frontend: skills.frontend || [],
    backend: skills.backend || [],
    frameworks: skills.frameworks || [],
    database: skills.database || [],
    cloud: skills.cloud || [],
    devops: skills.devops || [],
    ai: skills.ai || [],
    ml: skills.ml || [],
    dataScience: skills.dataScience || [],
    mobile: skills.mobile || [],
    testing: skills.testing || [],
    tools: skills.tools || [],
    soft: skills.soft || [],
    other: skills.other || [],
  };
}

function normalizeExperience(exp) {
  if (typeof exp === 'string') {
    return { company: '', designation: exp, employmentType: 'Full-time', location: '', startDate: '', endDate: '', current: false, duration: '', description: '', bullets: [], technologies: [] };
  }
  return {
    company: exp.company || exp.companyName || '',
    designation: exp.designation || exp.title || exp.role || '',
    employmentType: exp.employmentType || exp.type || 'Full-time',
    location: exp.location || '',
    startDate: exp.startDate || exp.start || '',
    endDate: exp.endDate || exp.end || '',
    current: exp.current || false,
    duration: exp.duration || '',
    description: exp.description || exp.summary || '',
    bullets: Array.isArray(exp.bullets) ? exp.bullets : (Array.isArray(exp.responsibilities) ? exp.responsibilities : []),
    technologies: Array.isArray(exp.technologies) ? exp.technologies : (Array.isArray(exp.techStack) ? exp.techStack : []),
  };
}

function normalizeEducation(edu) {
  if (typeof edu === 'string') {
    return { degree: edu, specialization: '', college: '', university: '', location: '', cgpa: '', percentage: '', startYear: '', endYear: '', current: false, description: '' };
  }
  return {
    degree: edu.degree || edu.degreeName || '',
    specialization: edu.specialization || edu.major || '',
    college: edu.college || edu.institution || edu.school || '',
    university: edu.university || '',
    location: edu.location || '',
    cgpa: edu.cgpa || edu.gpa || '',
    percentage: edu.percentage || '',
    startYear: edu.startYear || edu.year || '',
    endYear: edu.endYear || '',
    current: edu.current || false,
    description: edu.description || '',
  };
}

function normalizeProjects(proj) {
  if (typeof proj === 'string') {
    return { title: proj, description: '', responsibilities: [], features: [], technologies: [], github: '', deployment: '', demo: '' };
  }
  return {
    title: proj.title || proj.name || '',
    description: proj.description || '',
    responsibilities: Array.isArray(proj.responsibilities) ? proj.responsibilities : [],
    features: Array.isArray(proj.features) ? proj.features : [],
    technologies: Array.isArray(proj.technologies) ? proj.technologies : (Array.isArray(proj.techStack) ? proj.techStack : []),
    github: proj.github || proj.githubUrl || '',
    deployment: proj.deployment || proj.liveUrl || '',
    demo: proj.demo || proj.demoUrl || '',
  };
}

function normalizeCertifications(cert) {
  if (typeof cert === 'string') {
    return { name: cert, provider: '', issueDate: '', expiry: '', credentialId: '', credentialUrl: '' };
  }
  return {
    name: cert.name || cert.certificateName || cert.title || '',
    provider: cert.provider || cert.issuer || '',
    issueDate: cert.issueDate || cert.date || '',
    expiry: cert.expiry || cert.expiration || '',
    credentialId: cert.credentialId || cert.id || '',
    credentialUrl: cert.credentialUrl || cert.url || '',
  };
}

function normalizeLinks(data) {
  const links = {
    linkedin: data.linkedin || data.LinkedIn || '',
    github: data.github || data.GitHub || '',
    portfolio: data.portfolio || data.Portfolio || '',
    website: data.website || data.Website || '',
    gfg: data.gfg || data.GFG || data.geeksforgeeks || '',
    scaler: data.scaler || data.Scaler || '',
    medium: data.medium || '',
    hashnode: data.hashnode || '',
    devto: data.devto || data.dev || '',
    kaggle: data.kaggle || '',
    stackoverflow: data.stackoverflow || '',
    leetcode: data.leetcode || '',
    codeforces: data.codeforces || '',
    codechef: data.codechef || '',
    behance: data.behance || '',
    dribbble: data.dribbble || '',
    gitlab: data.gitlab || '',
    bitbucket: data.bitbucket || '',
    twitter: data.twitter || '',
    other: Array.isArray(data.other) ? data.other : [],
  };
  
  // Filter out empty values
  Object.keys(links).forEach(key => {
    if (key !== 'other' && !links[key]) {
      delete links[key];
    }
  });
  
  return links;
}

function normalizeCustomSection(section) {
  if (typeof section === 'string') {
    return { title: 'Custom Section', content: section };
  }
  return {
    title: section.title || section.heading || '',
    content: section.content || section.description || '',
  };
}

function normalizeArray(arr, normalizer) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => normalizer ? normalizer(item) : item).filter(Boolean);
}

function getEmptyResumeStructure() {
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
    education: [],
    experience: [],
    internships: [],
    projects: [],
    certifications: [],
    achievements: [],
    publications: [],
    research: [],
    volunteering: [],
    leadership: [],
    languages: [],
    skills: {
      programming: [],
      frontend: [],
      backend: [],
      frameworks: [],
      database: [],
      cloud: [],
      devops: [],
      ai: [],
      ml: [],
      dataScience: [],
      mobile: [],
      testing: [],
      tools: [],
      soft: [],
      other: [],
    },
    links: {},
    customSections: [],
    rawText: '',
    parserVersion: 'empty-v1',
    extractionConfidence: 0,
  };
}
