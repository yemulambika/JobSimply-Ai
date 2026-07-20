// ============================================================
// ATS ENGINE V2
// Reads from Resume JSON only - no PDF parsing
// Realtime ATS scoring
// ============================================================

const ATS_WEIGHTS = {
  contactInfo: 15,
  summary: 10,
  skills: 25,
  experience: 20,
  projects: 15,
  education: 10,
  keywords: 5,
  formatting: 5,
  completeness: 5,
};

/**
 * Calculate ATS score from Resume JSON
 */
function calculateAtsScore(resumeJSON) {
  if (!resumeJSON) return 0;
  
  const scores = {
    contactInfo: scoreContactInfo(resumeJSON.personalInfo),
    summary: scoreSummary(resumeJSON.summary),
    skills: scoreSkills(resumeJSON.skills),
    experience: scoreExperience(resumeJSON.experience),
    projects: scoreProjects(resumeJSON.projects),
    education: scoreEducation(resumeJSON.education),
    keywords: scoreKeywords(resumeJSON),
    formatting: scoreFormatting(resumeJSON),
    completeness: scoreCompleteness(resumeJSON),
  };
  
  // Weighted average
  let total = 0;
  for (const [key, weight] of Object.entries(ATS_WEIGHTS)) {
    total += (scores[key] / 100) * weight;
  }
  
  return Math.round(Math.min(100, total));
}

/**
 * Score contact information completeness
 */
function scoreContactInfo(personalInfo) {
  if (!personalInfo) return 0;
  const checks = [
    !!personalInfo.name,
    !!personalInfo.email,
    !!personalInfo.phone,
    !!personalInfo.location,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/**
 * Score summary quality
 */
function scoreSummary(summary) {
  if (!summary) return 0;
  const wordCount = summary.split(/\s+/).length;
  if (wordCount < 20) return 30;
  if (wordCount < 50) return 60;
  if (wordCount < 100) return 80;
  return 100;
}

/**
 * Score skills section
 */
function scoreSkills(skills) {
  if (!skills) return 0;
  const totalSkills = Object.values(skills).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  if (totalSkills < 5) return 30;
  if (totalSkills < 10) return 50;
  if (totalSkills < 20) return 70;
  if (totalSkills < 30) return 85;
  return 100;
}

/**
 * Score experience section
 */
function scoreExperience(experience) {
  if (!experience || experience.length === 0) return 20;
  
  let score = 40;
  for (const exp of experience) {
    if (exp.bullets?.length >= 3) score += 5;
    if (exp.technologies?.length > 0) score += 3;
    if (exp.current) score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Score projects section
 */
function scoreProjects(projects) {
  if (!projects || projects.length === 0) return 20;
  
  let score = 30;
  for (const proj of projects) {
    if (proj.technologies?.length > 0) score += 5;
    if (proj.github) score += 5;
    if (proj.features?.length > 0) score += 3;
  }
  
  return Math.min(100, score);
}

/**
 * Score education section
 */
function scoreEducation(education) {
  if (!education || education.length === 0) return 30;
  
  let score = 50;
  for (const edu of education) {
    if (edu.degree) score += 10;
    if (edu.college || edu.university) score += 10;
    if (edu.cgpa) score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Score keyword match (if keywords provided)
 */
function scoreKeywords(resumeJSON) {
  // This would be populated during tailoring
  if (!resumeJSON.keywords || !resumeJSON.keywords.length) return 50;
  return 70;
}

/**
 * Score formatting (based on JSON structure)
 */
function scoreFormatting(resumeJSON) {
  // Check if JSON structure is well-formed
  const requiredFields = ['personalInfo', 'skills', 'experience', 'education', 'projects'];
  let score = 50;
  
  for (const field of requiredFields) {
    if (resumeJSON[field]) score += 12.5;
  }
  
  return Math.min(100, score);
}

/**
 * Score completeness
 */
function scoreCompleteness(resumeJSON) {
  const requiredSections = [
    resumeJSON.summary,
    resumeJSON.skills,
    resumeJSON.experience,
    resumeJSON.education,
    resumeJSON.projects,
    resumeJSON.personalInfo?.email,
  ];
  
  const filled = requiredSections.filter(Boolean).length;
  return Math.round((filled / requiredSections.length) * 100);
}

/**
 * Get detailed ATS feedback
 */
function getAtsFeedback(resumeJSON) {
  const scores = {
    contactInfo: scoreContactInfo(resumeJSON.personalInfo),
    summary: scoreSummary(resumeJSON.summary),
    skills: scoreSkills(resumeJSON.skills),
    experience: scoreExperience(resumeJSON.experience),
    projects: scoreProjects(resumeJSON.projects),
    education: scoreEducation(resumeJSON.education),
  };
  
  const feedback = [];
  
  if (scores.contactInfo < 50) {
    feedback.push('Add complete contact information (phone, email, location)');
  }
  
  if (scores.summary < 50) {
    feedback.push('Add or improve professional summary');
  }
  
  if (scores.skills < 50) {
    feedback.push('Add more skills relevant to your target roles');
  }
  
  if (scores.experience < 50) {
    feedback.push('Add more work experience with detailed bullet points');
  }
  
  if (scores.projects < 50) {
    feedback.push('Add projects with technologies used');
  }
  
  return {
    scores,
    feedback,
    overallScore: calculateAtsScore(resumeJSON),
  };
}

/**
 * Match resume keywords against job description
 */
function matchJobKeywords(resumeJSON, jobDescription) {
  if (!jobDescription) return { matchScore: 0, missingSkills: [], matchingSkills: [] };
  
  const jobText = jobDescription.toLowerCase();
  const resumeSkills = getAllSkills(resumeJSON);
  const matchingSkills = [];
  const missingSkills = [];
  
  // Common tech keywords to look for
  const commonKeywords = extractKeywords(jobText);
  
  for (const keyword of commonKeywords) {
    if (resumeSkills.some(s => s.toLowerCase().includes(keyword.toLowerCase()))) {
      matchingSkills.push(keyword);
    } else {
      missingSkills.push(keyword);
    }
  }
  
  const matchScore = Math.round((matchingSkills.length / (matchingSkills.length + missingSkills.length)) * 100) || 50;
  
  return {
    matchScore,
    matchingSkills: [...new Set(matchingSkills)],
    missingSkills: [...new Set(missingSkills)],
  };
}

/**
 * Extract keywords from job description
 */
function extractKeywords(text) {
  const keywords = new Set();
  
  // Common patterns
  const patterns = [
    /\b(react|vue|angular|nodejs|python|java|javascript|typescript)\b/gi,
    /\b(mongodb|mysql|postgresql|redis|aws|azure|docker|kubernetes)\b/gi,
    /\b(backend|frontend|fullstack|full stack|api|rest|graphql)\b/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => keywords.add(m.toLowerCase()));
    }
  }
  
  return [...keywords];
}

/**
 * Get all skills from resume as flat array
 */
function getAllSkills(resumeJSON) {
  const skills = [];
  if (resumeJSON.skills) {
    for (const arr of Object.values(resumeJSON.skills)) {
      if (Array.isArray(arr)) {
        skills.push(...arr.map(s => typeof s === 'string' ? s : s));
      }
    }
  }
  return skills;
}

// Export functions
export {
  calculateAtsScore,
  getAtsFeedback,
  matchJobKeywords,
  getAllSkills,
};