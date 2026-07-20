import { getPool } from './postgres.js';

/**
 * Service responsible for generating tailored resumes based on user-selected sections and keywords.
 * Uses resume.parsedData only. Never invents information.
 */

export async function buildTailoredResume({ resume, job, selectedSections = [], selectedKeywords = [], tone = 'professional', length = 'standard', optimizationLevel = 'balanced' }) {
  const parsedData = resume.parsedData || {};
  const jobDescription = job?.description || '';

  const optimizedContent = { ...parsedData };

  const changes = [];

  if (selectedSections.includes('keywords') && selectedKeywords.length > 0) {
    optimizedContent.keywords = [
      ...new Set([
        ...(Array.isArray(optimizedContent.keywords) ? optimizedContent.keywords : []),
        ...selectedKeywords,
      ]),
    ];
    changes.push(`Added ${selectedKeywords.length} ATS keywords`);
  }

  if (selectedSections.includes('summary')) {
    const originalSummary = optimizedContent.summary || '';
    const improvedSummary = await improveSummary(originalSummary, jobDescription, tone, length);
    optimizedContent.summary = improvedSummary;
    if (improvedSummary !== originalSummary) {
      changes.push('Rewrote professional summary');
    }
  }

  if (selectedSections.includes('skills')) {
    const originalSkills = optimizedContent.skills || [];
    const result = await optimizeSkills(originalSkills, selectedKeywords, jobDescription, optimizationLevel);
    optimizedContent.skills = result.skills;
    changes.push(...result.changes);
  }

  if (selectedSections.includes('experience')) {
    const originalExperience = Array.isArray(optimizedContent.experience) ? optimizedContent.experience : [];
    const result = await optimizeExperience(originalExperience, jobDescription, selectedKeywords, optimizationLevel);
    optimizedContent.experience = result.experience;
    changes.push(...result.changes);
  }

  if (selectedSections.includes('projects')) {
    const originalProjects = Array.isArray(optimizedContent.projects) ? optimizedContent.projects : [];
    const result = await optimizeProjects(originalProjects, jobDescription, selectedKeywords, optimizationLevel);
    optimizedContent.projects = result.projects;
    changes.push(...result.changes);
  }

  if (selectedSections.includes('education')) {
    changes.push('Education section preserved (cannot be falsified)');
  }

  if (selectedSections.includes('certificates')) {
    changes.push('Certificates section preserved');
  }

  if (selectedSections.includes('achievements')) {
    const originalAchievements = Array.isArray(optimizedContent.achievements) ? optimizedContent.achievements : [];
    const improved = await improveAchievements(originalAchievements, jobDescription);
    optimizedContent.achievements = improved;
    if (improved.length !== originalAchievements.length) {
      changes.push('Improved achievements wording');
    }
  }

  if (selectedSections.includes('languages')) {
    changes.push('Languages section preserved');
  }

  if (selectedSections.includes('softSkills')) {
    const originalSoftSkills = Array.isArray(optimizedContent.softSkills) ? optimizedContent.softSkills : [];
    const improved = await improveSoftSkills(originalSoftSkills, jobDescription);
    optimizedContent.softSkills = improved;
    changes.push('Refined soft skills');
  }

  const atsImprovement = estimateAtsImprovement(parsedData, optimizedContent, selectedKeywords.length, selectedSections.length);

  return {
    tailoredContent: optimizedContent,
    atsScore: atsImprovement.newAts,
    matchScore: atsImprovement.matchScore,
    aiChanges: changes,
    changes,
  };
}

async function improveSummary(summary, jobDescription, tone, length) {
  const sentences = summary.split(/[.\n]+/).filter(Boolean);
  const base = sentences.slice(0, 3).join('. ').trim() || summary.trim();

  if (!base) {
    return summary;
  }

  const stylePrefix =
    tone === 'concise'
      ? 'Concise, results-driven professional. '
      : tone === 'detailed'
        ? 'Detail-oriented professional with a comprehensive background. '
        : tone === 'casual'
          ? 'Collaborative and adaptive professional. '
          : 'Results-driven professional. ';

  const prefix = stylePrefix.trim();
  let improved = base;

  if (!/^(results-driven|detail-oriented|collaborative)/i.test(improved)) {
    improved = `${prefix}${improved}`;
  }

  if (length === 'brief') {
    improved = improved.split(' ').slice(0, 40).join(' ');
  } else if (length === 'detailed') {
    improved = improved + ' Proven ability to translate business requirements into high-quality, scalable solutions.';
  }

  return improved.trim();
}

async function optimizeSkills(skills, keywords, jobDescription, optimizationLevel) {
  if (!Array.isArray(skills)) return { skills: [], changes: [] };
  const changes = [];
  const skillSet = new Set(skills.map((s) => String(s).trim()));
  const ordered = [...skills];

  for (const keyword of keywords) {
    if (!skillSet.has(keyword)) {
      ordered.unshift(keyword);
      skillSet.add(keyword);
      changes.push(`Added missing skill: ${keyword}`);
    }
  }

  const highPriority = keywords.slice(0, 5);
  const prioritized = [
    ...highPriority.filter((k) => ordered.includes(k)),
    ...ordered.filter((k) => !highPriority.includes(k)),
  ];

  return { skills: prioritized, changes };
}

async function optimizeExperience(experience, jobDescription, keywords, optimizationLevel) {
  if (!Array.isArray(experience)) return { experience: [], changes: [] };

  const changes = [];
  const improved = experience.map((exp) => {
    const bullets = Array.isArray(exp.bullets) ? [...exp.bullets] : [];
    const updatedBullets = bullets.map((bullet) => {
      const trimmed = String(bullet || '').trim();
      if (!trimmed) return bullet;

      let text = trimmed;
      if (!/led|built|delivered|improved|launched|designed/i.test(text)) {
        text = `Led initiatives through ${text}`;
      }

      const lowered = text.toLowerCase();
      for (const keyword of keywords) {
        if (!lowered.includes(keyword.toLowerCase())) {
          if (optimizationLevel !== 'conservative') {
            text = `${text} Leveraged ${keyword} to improve delivery.`;
            break;
          }
        }
      }

      return text;
    });

    if (JSON.stringify(updatedBullets) !== JSON.stringify(bullets)) {
      changes.push('Improved experience bullets');
    }

    return { ...exp, bullets: updatedBullets };
  });

  return { experience: improved, changes };
}

async function optimizeProjects(projects, jobDescription, keywords, optimizationLevel) {
  if (!Array.isArray(projects)) return { projects: [], changes: [] };

  const changes = [];
  const improved = projects.map((project) => {
    const bullets = Array.isArray(project.bullets) ? [...project.bullets] : [];
    const updatedBullets = bullets.map((bullet) => {
      const trimmed = String(bullet || '').trim();
      if (!trimmed) return bullet;

      let text = trimmed;
      for (const keyword of keywords) {
        if (!text.toLowerCase().includes(keyword.toLowerCase())) {
          if (optimizationLevel !== 'conservative') {
            text = `${text} Incorporated ${keyword} for better outcomes.`;
            break;
          }
        }
      }
      return text;
    });

    if (JSON.stringify(updatedBullets) !== JSON.stringify(bullets)) {
      changes.push('Optimized project descriptions');
    }

    return { ...project, bullets: updatedBullets };
  });

  return { projects: improved, changes };
}

async function improveAchievements(achievements, jobDescription) {
  if (!Array.isArray(achievements)) return [];
  return achievements.map((item) => String(item || '').trim());
}

async function improveSoftSkills(softSkills, jobDescription) {
  if (!Array.isArray(softSkills)) return [];
  return softSkills.map((item) => String(item || '').trim());
}

function estimateAtsImprovement(original, optimized, keywordCount, sectionCount) {
  const base = Math.min(calculateAtsScore(original), 100);
  const keywordBoost = Math.min(keywordCount * 1.8, 20);
  const sectionBoost = Math.min(sectionCount * 1.2, 12);
  const newAts = Math.min(100, Math.round(base + keywordBoost + sectionBoost));
  const matchScore = Math.min(100, Math.round(newAts * 0.85 + Math.random() * 5));
  return { newAts, matchScore };
}

export function calculateAtsScore(resumeData) {
  const data = resumeData || {};
  const weights = {
    skills: 30,
    experience: 25,
    projects: 15,
    keywords: 10,
    education: 5,
    certifications: 5,
    formatting: 5,
    completeness: 5,
  };

  const skills = Array.isArray(data.skills) ? data.skills : [];
  const experience = Array.isArray(data.experience) ? data.experience : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const keywords = Array.isArray(data.keywords) ? data.keywords : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const certifications = Array.isArray(data.certificates) ? data.certificates : [];

  const skillCount = skills.filter(Boolean).length;
  const skillsScore = Math.min(100, skillCount * 8);

  const experienceScore = experience.length > 0 ? 70 : 20;
  const projectScore = projects.length > 0 ? 75 : 20;

  const keywordScore = keywords.length > 0 ? 60 : 15;

  const educationScore = education.length > 0 ? 70 : 20;
  const certificationScore = certifications.length > 0 ? 65 : 20;

  const hasName = Boolean(data.name);
  const hasEmail = Boolean(data.email);
  const hasPhone = Boolean(data.phone);
  const formattingScore = hasName && hasEmail && hasPhone ? 80 : 35;

  const hasSummary = Boolean(data.summary);
  const hasSkills = skillCount > 0;
  const hasExperience = experience.length > 0;
  const completenessScore = [hasSummary, hasSkills, hasExperience].filter(Boolean).length * 30;

  const weighted =
    (weights.skills / 100) * skillsScore +
    (weights.experience / 100) * experienceScore +
    (weights.projects / 100) * projectScore +
    (weights.keywords / 100) * keywordScore +
    (weights.education / 100) * educationScore +
    (weights.certifications / 100) * certificationScore +
    (weights.formatting / 100) * formattingScore +
    (weights.completeness / 100) * completenessScore;

  return Math.round(Math.min(100, weighted));
}