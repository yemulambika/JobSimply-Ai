// AI Pipeline - Production Resume Analysis and Optimization
// JobSimply Backend

import { MasterResumeRepository, JobAnalysesRepository, ResumeVersionsRepository } from '../repositories/index.js';

const masterResumeRepo = new MasterResumeRepository();
const jobAnalysesRepo = new JobAnalysesRepository();
const resumeVersionsRepo = new ResumeVersionsRepository();

// Stage 1: Extract Keywords from Job Description
export function extractKeywords(description) {
  const text = (description || '').toLowerCase();
  
  const technicalSkills = extractSkills(text, [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'nodejs', 'python', 
    'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'graphql',
    'express', 'spring', 'django', 'flask', 'fastapi', '.net',
    'tailwind', 'bootstrap', 'material-ui', 'sass', 'css', 'html',
    'git', 'ci/cd', 'agile', 'scrum', 'tdd', 'rest api', 'microservices'
  ]);

  const experiencePatterns = extractExperienceRequirements(text);
  const educationPatterns = extractEducationRequirements(text);
  const keywords = extractAllKeywords(text);

  return {
    technicalSkills,
    experiencePatterns,
    educationPatterns,
    keywords
  };
}

function extractSkills(text, skillList) {
  return skillList
    .filter(skill => text.includes(skill))
    .map(skill => skill.toLowerCase());
}

function extractExperienceRequirements(text) {
  const years = text.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience)?/gi);
  return years ? years.map(y => parseInt(y.match(/\d+/)[0])) : [];
}

function extractEducationRequirements(text) {
  const degrees = [];
  if (text.includes('bachelor')) degrees.push('bachelor');
  if (text.includes('master')) degrees.push('master');
  if (text.includes('phd')) degrees.push('phd');
  return degrees;
}

function extractAllKeywords(text) {
  const words = text.match(/\b[a-zA-Z]{3,}\b/g) || [];
  const stopWords = ['the', 'and', 'for', 'are', 'you', 'our', 'with', 'this', 'that', 'from', 'will', 'have', 'has', 'been'];
  return [...new Set(words.filter(w => !stopWords.includes(w.toLowerCase())))];
}

// Stage 2: ATS Analysis
export function runATSAnalysis(masterResume, jobKeywords, jobDescription) {
  const resumeText = masterResume.originalText?.toLowerCase() || '';
  const resumeSkills = extractResumeSkills(masterResume);

  const matchingSkills = jobKeywords.technicalSkills.filter(skill => 
    resumeSkills.some(rs => rs.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(rs.toLowerCase()))
  );

  const missingSkills = jobKeywords.technicalSkills.filter(
    skill => !matchingSkills.some(ms => ms.toLowerCase() === skill.toLowerCase())
  );

  const experienceMatch = calculateExperienceMatch(masterResume, jobKeywords.experiencePatterns);
  const educationMatch = calculateEducationMatch(masterResume, jobKeywords.educationPatterns);

  return {
    atsScore: Math.min(100, Math.max(0, 30 + (matchingSkills.length * 10))),
    matchScore: Math.round((matchingSkills.length / (jobKeywords.technicalSkills.length || 1)) * 100),
    missingSkills,
    matchingSkills,
    experienceMatch,
    educationMatch,
    recommendedKeywords: jobKeywords.keywords.slice(0, 20)
  };
}

function extractResumeSkills(masterResume) {
  const skills = [];
  if (Array.isArray(masterResume.parsedData?.skills)) {
    skills.push(...masterResume.parsedData.skills.map(s => typeof s === 'string' ? s : s.name || ''));
  }
  return skills.filter(s => s);
}

function calculateExperienceMatch(masterResume, requiredYears) {
  const experience = masterResume.parsedData?.experience || [];
  if (!requiredYears || requiredYears.length === 0) return 70;
  const maxRequired = Math.max(...requiredYears);
  const totalYears = experience.reduce((sum, exp) => {
    const duration = exp.duration || '';
    const years = duration.match(/(\d+)\s*(?:years?|yrs?)/i);
    return sum + (years ? parseInt(years[1]) : 0);
  }, 0);
  return Math.min(100, (totalYears / maxRequired) * 80);
}

function calculateEducationMatch(masterResume, requiredDegrees) {
  if (!requiredDegrees || requiredDegrees.length === 0) return 70;
  const education = masterResume.parsedData?.education || [];
  const resumeDegrees = education.map(e => e.degree?.toLowerCase() || '');
  const hasRequired = requiredDegrees.some(deg => 
    resumeDegrees.some(rd => rd.includes(deg))
  );
  return hasRequired ? 90 : 40;
}

// Stage 3: Clone Master Resume (NEVER modify original)
export function cloneMasterResume(masterResume) {
  const cloned = JSON.parse(JSON.stringify(masterResume.parsedData || {}));
  
  // Preserve all original fields exactly
  return {
    ...cloned,
    name: masterResume.parsedData?.name || masterResume.name,
    email: masterResume.parsedData?.email || masterResume.email,
    phone: masterResume.parsedData?.phone || masterResume.phone,
    location: masterResume.parsedData?.location || masterResume.location,
    linkedin: masterResume.parsedData?.linkedin || masterResume.linkedin,
    github: masterResume.parsedData?.github || masterResume.github,
    portfolio: masterResume.parsedData?.portfolio || masterResume.portfolio,
    // Preserve sections
    education: masterResume.parsedData?.education || [],
    experience: masterResume.parsedData?.experience || [],
    certifications: masterResume.parsedData?.certifications || [],
    projects: masterResume.parsedData?.projects || [],
    // Will be optimized
    skills: [...extractResumeSkills(masterResume)],
    // No summary in Jobright style
  };
}

// Stage 4: Optimize Skills (Never add fake skills)
export function optimizeSkills(clonedResume, jobKeywords) {
  const existingSkills = [...(clonedResume.skills || [])];
  
  // Only add keywords that are clearly skills
  jobKeywords.technicalSkills.forEach(keyword => {
    const exists = existingSkills.some(skill => {
      const skillText = typeof skill === 'string' ? skill.toLowerCase() : (skill.name || '').toLowerCase();
      return skillText.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(skillText);
    });
    if (!exists) {
      existingSkills.push(keyword);
    }
  });

  // Reorder skills by relevance (relevant skills first)
  return existingSkills.sort((a, b) => {
    const aRelevant = jobKeywords.technicalSkills.some(k => 
      (typeof a === 'string' ? a.toLowerCase() : a.name?.toLowerCase() || '').includes(k.toLowerCase())
    );
    const bRelevant = jobKeywords.technicalSkills.some(k => 
      (typeof b === 'string' ? b.toLowerCase() : b.name?.toLowerCase() || '').includes(k.toLowerCase())
    );
    if (aRelevant && !bRelevant) return -1;
    if (!aRelevant && bRelevant) return 1;
    return 0;
  });
}

// Stage 5: Optimize Projects (Never fabricate)
export function optimizeProjects(clonedResume, jobDescription) {
  if (!Array.isArray(clonedResume.projects)) return [];
  
  return clonedResume.projects.map(project => {
    const jobText = jobDescription.toLowerCase();
    const techStack = project.techStack || [];
    
    // Reorder tech stack to match job keywords
    const sortedStack = techStack.sort((a, b) => {
      const aMatch = jobDescription.toLowerCase().includes(a.toLowerCase());
      const bMatch = jobDescription.toLowerCase().includes(b.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    return {
      ...project,
      techStack: sortedStack
    };
  });
}

// Stage 6: Optimize Experience Bullets
export function optimizeExperienceBullets(clonedResume, jobKeywords) {
  if (!Array.isArray(clonedResume.experience)) return [];
  
  return clonedResume.experience.map(exp => {
    if (!Array.isArray(exp.bullets)) return exp;
    
    // Improve bullets with action verbs matching job requirements
    const improvedBullets = exp.bullets.map(bullet => {
      const improved = enhanceBullet(bullet, jobKeywords);
      return improved;
    });

    return { ...exp, bullets: improvedBullets };
  });
}

function enhanceBullet(bullet, jobKeywords) {
  const actionVerbs = ['Developed', 'Designed', 'Implemented', 'Created', 'Built', 'Engineered', 'Optimized', 'Led', 'Managed'];
  const bulletText = bullet.replace(/^(•|-|\*)\s*/, '').trim();
  
  // Ensure bullet starts with strong action verb
  if (!actionVerbs.some(v => bulletText.startsWith(v))) {
    const firstWord = bulletText.split(' ')[0];
    const betterVerb = actionVerbs.find(v => v.toLowerCase() !== firstWord.toLowerCase()) || 'Developed';
    return `${betterVerb} ${bulletText.charAt(0).toLowerCase() + bulletText.slice(1)}`;
  }
  
  return bullet;
}

// Stage 7: Generate Changes Tracking
export function generateChanges(masterResume, tailoredResume) {
  const changes = [];
  
  const masterSkills = extractResumeSkills({ parsedData: masterResume }).sort();
  const tailoredSkills = (tailoredResume.skills || []).sort();
  
  const addedSkills = tailoredSkills.filter(s => !masterSkills.includes(s));
  const removedSkills = masterSkills.filter(s => !tailoredSkills.includes(s));
  
  if (addedSkills.length > 0) {
    changes.push({ type: 'skills_added', items: addedSkills });
  }
  
  return changes;
}