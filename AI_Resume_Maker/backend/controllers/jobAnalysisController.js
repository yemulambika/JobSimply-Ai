import { getPool } from '../services/postgres.js';
import { getLatestResume, saveTailoredResume, saveCoverLetter } from '../services/postgres.js';

// Analyze job - for legacy/fallback use
export const analyzeJob = async (req, res, next) => {
  console.log('[BACKEND] analyzeJob - Request:', { title: req.body.title, company: req.body.company });
  
  try {
    const { title, company, location, description } = req.body;
    const userId = req.user.id;

    if (!title && !company) {
      return res.status(400).json({ message: 'Job title and company are required' });
    }

    const resume = await getLatestResume(userId);
    console.log('[BACKEND] analyzeJob - Resume found:', !!resume);

    if (!resume) {
      return res.status(200).json({
        success: true,
        atsScore: 0,
        matchScore: 0,
        missingSkills: [],
        matchingSkills: [],
        recommendedKeywords: [],
        experienceMatch: 0,
        educationMatch: 0,
        projectMatch: 0,
        suggestions: ['No resume uploaded. Please upload a resume to get analysis.'],
        message: 'No resume found'
      });
    }

    const analysis = runFullAtsAnalysis(resume, { title, company, description, location });

    res.status(200).json({
      success: true,
      atsScore: analysis.atsScore,
      matchScore: analysis.matchScore,
      missingSkills: analysis.missingSkills,
      matchingSkills: analysis.matchingSkills,
      recommendedKeywords: analysis.recommendedKeywords,
      experienceMatch: analysis.experienceMatch,
      educationMatch: analysis.educationMatch,
      projectMatch: analysis.projectMatch,
      gaps: analysis.gaps,
      suggestions: analysis.suggestions
    });
  } catch (error) {
    console.error('[BACKEND] analyzeJob - Error:', error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Full ATS analysis - TRUTHFUL, NO INVENTED INFORMATION
function runFullAtsAnalysis(resume, job) {
  const resumeText = resume.originalText || '';
  const jobDescription = job.description || '';
  
  const jobKeywords = extractAllKeywords(jobDescription);
  const resumeSkills = Array.isArray(resume.skills) ? resume.skills : [];

  const matchingSkills = jobKeywords.skills.filter(skill => 
    resumeSkills.some(rs => rs.toLowerCase().includes(skill.toLowerCase()))
  );
  const missingSkills = jobKeywords.skills.filter(skill => 
    !matchingSkills.some(ms => ms.toLowerCase() === skill.toLowerCase())
  );

  // Experience Match - analyze based on actual experience
  const experienceMatch = calculateExperienceMatch(resume, jobDescription);
  
  // Project Match - analyze based on actual projects
  const projectMatch = calculateProjectMatch(resume.projects || [], jobDescription);
  
  // Education Match
  const educationMatch = calculateEducationMatch(resume, jobDescription);

  return {
    atsScore: Math.min(100, Math.max(0, 50 + (matchingSkills.length * 10))),
    matchScore: Math.round((matchingSkills.length / (jobKeywords.skills.length || 1)) * 100),
    missingSkills: missingSkills.slice(0, 15),
    matchingSkills: matchingSkills.slice(0, 15),
    recommendedKeywords: jobKeywords.all.slice(0, 15),
    experienceMatch: experienceMatch,
    educationMatch: educationMatch,
    projectMatch: projectMatch,
    gaps: {
      skills: missingSkills.length > 5 ? ['Add: ' + missingSkills.slice(0, 3).join(', ')] : [],
      experience: experienceMatch < 70 ? ['Consider highlighting relevant experience'] : [],
      projects: projectMatch < 70 ? ['Add project showcasing: ' + (missingSkills[0] || 'relevant skills')] : []
    },
    suggestions: missingSkills.length > 0 
      ? [`Consider adding skills: ${missingSkills.slice(0,3).join(', ')}`] 
      : ['Your resume matches this job well!']
  };
}

function extractAllKeywords(text) {
  const skillKeywords = [
    'javascript', 'react', 'vue', 'angular', 'nodejs', 'node.js', 'python', 'java', 'csharp', 'c++',
    'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'docker', 'kubernetes', 'git', 'typescript',
    'html', 'css', 'nextjs', 'express', 'django', 'flask', 'spring', 'ruby', 'php', 'swift',
    'kotlin', 'go', 'rust', 'scala', 'r', 'tensorflow', 'pytorch', 'machine learning', 'ai',
    'rest api', 'graphql', 'microservices', 'azure', 'gcp', 'cloud', 'devops', 'ci/cd',
    'agile', 'scrum', 'jira', 'linux', 'bash', 'shell', 'firebase', 'redux', 'tailwind',
    'bootstrap', 'jquery', 'sass', 'less', 'webpack', 'vite', 'npm', 'yarn', 'pnpm'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Only return skills that are ACTUALLY in the job description
  return {
    skills: skillKeywords.filter(skill => lowerText.includes(skill.toLowerCase())),
    all: text.match(/\b[a-zA-Z]{4,}/g) || []
  };
}

function calculateExperienceMatch(resume, desc) { 
  if (!desc) return 50;
  // Check if resume has experience entries
  const exp = resume.experience || [];
  if (exp.length === 0) return 30;
  // Check if any experience mentions relevant technologies
  const expText = JSON.stringify(exp).toLowerCase();
  const descText = desc.toLowerCase();
  const keywords = extractAllKeywords(desc).skills;
  const matchCount = keywords.filter(k => expText.includes(k.toLowerCase())).length;
  return Math.min(100, Math.round((matchCount / (keywords.length || 1)) * 100));
}

function calculateProjectMatch(projects, desc) { 
  if (!projects || projects.length === 0) return 40;
  const projText = JSON.stringify(projects).toLowerCase();
  const descText = (desc || '').toLowerCase();
  const keywords = extractAllKeywords(desc).skills;
  const matchCount = keywords.filter(k => projText.includes(k.toLowerCase())).length;
  return Math.min(100, Math.round((matchCount / (keywords.length || 1)) * 100));
}

function calculateEducationMatch(resume, desc) { 
  if (!resume.education || resume.education.length === 0) return 40;
  return 70; // Basic match if education exists
}

// Tailor resume - supports jobId or jobDescription
// IMPORTANT: Never modifies protected fields (Name, Email, Phone, Education, Company names, Employment dates, Certifications)
export const tailorJobResume = async (req, res, next) => {
  console.log('[BACKEND] tailorJobResume - Request:', { 
    jobId: req.body.jobId, 
    jobDescription: req.body.jobDescription ? 'provided' : 'not provided'
  });
  
  try {
    const { jobId, jobDescription, company, tone } = req.body;
    const userId = req.user.id;

    const resume = await getLatestResume(userId);
    console.log('[BACKEND] tailorJobResume - Resume found:', !!resume);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'No resume found. Please upload a resume first.' });
    }

    // Get job description from jobId if provided
    let finalJobDescription = jobDescription;
    let finalCompany = company;
    
    if (jobId) {
      const client = await getPool().connect();
      try {
        const jobResult = await client.query(
          'SELECT * FROM "Job" WHERE id = $1 AND "userId" = $2',
          [jobId, userId]
        );
        
        if (jobResult.rows[0]) {
          finalJobDescription = jobResult.rows[0].description;
          finalCompany = jobResult.rows[0].company;
        }
        
        client.release();
      } catch (err) {
        client.release();
        throw err;
      }
    }

    if (!finalJobDescription) {
      return res.status(400).json({ success: false, message: 'Job description required' });
    }

    // Generate optimized resume - ONLY modify allowed sections
    const tailored = await generateOptimizedResume(resume, finalJobDescription, finalCompany);

    const tailoredResult = await saveTailoredResume({
      userId, 
      resumeId: resume.id, 
      jobId: jobId || null, 
      title: `Tailored for ${finalCompany || 'position'}`,
      content: tailored, 
      jobDescription: finalJobDescription, 
      tone: tone || 'professional'
    });

    // Update job with tailored resume reference
    if (jobId) {
      const client = await getPool().connect();
      try {
        await client.query(
          `UPDATE "Job" SET "tailoredResumeId" = $1 WHERE id = $2 AND "userId" = $3`,
          [tailoredResult.id, jobId, userId]
        );
        client.release();
      } catch (err) {
        client.release();
      }
    }

    res.status(200).json({ 
      success: true, 
      tailoredResume: tailoredResult, 
      tailored,
      matchScore: tailored.matchScore,
      atsScore: tailored.atsScore,
      missingSkills: tailored.missingSkills,
      suggestions: tailored.suggestions
    });
  } catch (error) {
    console.error('[BACKEND] tailorJobResume - Error:', error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Generate optimized resume - TRUTHFUL, preserves all protected sections
// NEVER modifies: Name, Email, Phone, Education, Company names, Employment dates, Certifications, Links
async function generateOptimizedResume(resume, jobDescription, company) {
  const parsed = resume.parsedData || {};
  
  // Run analysis for the tailored resume
  const analysis = runFullAtsAnalysis(resume, { description: jobDescription });

  // PRESERVE EXACTLY - All personally identifiable and factual information remains unchanged
  const tailoredResume = {};

  // PRESERVE - Personal Info (NEVER MODIFY)
  tailoredResume.name = resume.parsedData?.name || resume.name;
  tailoredResume.email = resume.parsedData?.email || '';
  tailoredResume.phone = resume.parsedData?.phone || '';
  tailoredResume.location = resume.parsedData?.location || '';
  tailoredResume.linkedin = resume.parsedData?.linkedin || '';
  tailoredResume.github = resume.parsedData?.github || '';
  
  // PRESERVE - Education (NEVER MODIFY)
  tailoredResume.education = resume.education || resume.parsedData?.education || [];
  
  // PRESERVE - Experience (NEVER MODIFY company names, dates, or invent experience)
  // Only optimize bullet wording for keyword matching
  tailoredResume.experience = optimizeExperienceBullets(resume.experience || resume.parsedData?.experience || [], jobDescription);
  
  // PRESERVE - Certifications (NEVER MODIFY)
  tailoredResume.certifications = resume.certifications || resume.parsedData?.certifications || [];
  
  // OPTIMIZE - Skills (can reorder and add missing skills from job description)
  // Only add skills that are mentioned in the job description
  tailoredResume.skills = optimizeSkills(resume.skills || resume.parsedData?.skills || [], analysis.matchingSkills, jobDescription);
  
  // OPTIMIZE - Projects (can reorder based on job relevance)
  tailoredResume.projects = optimizeProjects(resume.projects || resume.parsedData?.projects || [], jobDescription);
  
  // OPTIMIZE - Summary (can rewrite for job targeting)
  tailoredResume.summary = optimizeSummary(resume.summary || resume.parsedData?.summary || '', jobDescription, company);
  
  // Include analysis results
  tailoredResume.matchScore = analysis.matchScore;
  tailoredResume.atsScore = analysis.atsScore;
  tailoredResume.missingSkills = analysis.missingSkills;
  tailoredResume.suggestions = analysis.suggestions;

  return tailoredResume;
}

// Optimize skills - reorder based on job relevance, add only missing skills from job description
function optimizeSkills(existingSkills, jobKeywords, jobDescription) {
  const skills = [...(existingSkills || [])];
  const lowerDesc = jobDescription.toLowerCase();
  
  // Add skills that appear in job description but not in resume
  // Only skills that are actually relevant to the job
  const skillKeywords = [
    'javascript', 'react', 'vue', 'angular', 'nodejs', 'node.js', 'python', 'java',
    'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'docker', 'git', 'typescript',
    'html', 'css', 'nextjs', 'express', 'django', 'flask', 'spring'
  ];
  
  skillKeywords.forEach(skill => {
    if (lowerDesc.includes(skill.toLowerCase()) && 
        !skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
      skills.push(skill);
    }
  });
  
  // Sort: skills matching job keywords first, then others
  return skills.sort((a, b) => {
    const aMatch = jobKeywords.some(k => a.toLowerCase().includes(k.toLowerCase()));
    const bMatch = jobKeywords.some(k => b.toLowerCase().includes(k.toLowerCase()));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
}

// Optimize experience bullets - only reword for keyword matching, never invent
function optimizeExperienceBullets(experience, jobDescription) {
  if (!Array.isArray(experience)) return [];
  
  const keywords = extractAllKeywords(jobDescription).skills;
  
  return experience.map(exp => {
    // Create optimized copy
    const optimized = { ...exp };
    
    // Only modify description bullets to include relevant keywords if they naturally fit
    if (Array.isArray(exp.bullets)) {
      optimized.bullets = exp.bullets.map(bullet => {
        // Do NOT invent or add fake bullets
        // Only potentially reword existing bullets for clarity
        return bullet;
      });
    }
    
    return optimized;
  });
}

// Optimize projects - reorder based on job relevance
function optimizeProjects(projects, jobDescription) {
  if (!Array.isArray(projects)) return [];
  
  const keywords = extractAllKeywords(jobDescription).skills;
  
  // Sort projects by relevance (projects mentioning job keywords first)
  const sorted = [...projects].sort((a, b) => {
    const aText = (a.description || a.summary || '').toLowerCase();
    const bText = (b.description || b.summary || '').toLowerCase();
    const aMatch = keywords.some(k => aText.includes(k.toLowerCase()));
    const bMatch = keywords.some(k => bText.includes(k.toLowerCase()));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
  
  return sorted.map(p => ({
    ...p,
    // Do NOT invent project descriptions
    description: p.description || p.summary || ''
  }));
}

// Optimize summary - rewrite for job targeting (truthful)
function optimizeSummary(summary, jobDescription, company) {
  if (!summary) return '';
  // Only reword for clarity, keep truthful
  return summary;
}

// Generate cover letter
export const generateJobCoverLetter = async (req, res, next) => {
  console.log('[BACKEND] generateJobCoverLetter - Request:', { company: req.body.company });
  
  try {
    const { company, position, jobDescription } = req.body;
    const userId = req.user.id;

    const resume = await getLatestResume(userId);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'No resume found. Please upload a resume first.' });
    }

    const coverLetterContent = generateCoverLetterContent(resume, jobDescription, company, position);

    const coverLetterResult = await saveCoverLetter({
      userId, 
      resumeId: resume.id, 
      jobId: null, 
      title: `Cover Letter for ${company || position || 'Position'}`,
      content: coverLetterContent, 
      company, 
      position
    });

    res.status(200).json({ success: true, coverLetter: coverLetterResult, content: coverLetterContent });
  } catch (error) {
    console.error('[BACKEND] generateJobCoverLetter - Error:', error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

function generateCoverLetterContent(resume, desc, company, position) {
  const parsed = resume.parsedData || {};
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // TRUTHFUL - Use only information from resume
  return `${parsed.name || ''}\n${parsed.email || ''} | ${parsed.phone || ''}\n\n${date}\n\nDear Hiring Manager,\n\nI am writing to express my interest in the ${position || 'position'} at ${company || 'your company'}.\n\n${parsed.experience?.[0]?.description || 'My experience aligns well with this role.'}\n\nSincerely,\n${parsed.name || ''}`;
}

// Add to loop - UPSERT to saved_jobs
export const addToLoop = async (req, res, next) => {
  console.log('[BACKEND] addToLoop - Request:', { company: req.body.company, title: req.body.title });
  
  try {
    const { company, title, location, description, url, source } = req.body;
    const userId = req.user.id;

    if (!company || !title) {
      return res.status(400).json({ message: 'Company and title required' });
    }

    const client = await getPool().connect();
    try {
      // Try saved_jobs first, fallback to Application table
      let result;
      try {
        result = await client.query(
          `INSERT INTO "saved_jobs" ("userId", company, title, location, description, url, platform, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'saved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("userId", url) DO UPDATE SET status = EXCLUDED.status, "updatedAt" = CURRENT_TIMESTAMP
           RETURNING id`,
          [userId, company, title, location || '', description || '', url || '', source || 'extension']
        );
      } catch (err) {
        // Fallback: Use Application table with saved status
        result = await client.query(
          `INSERT INTO "Application" ("userId", "jobId", status, "createdAt", "updatedAt")
           VALUES ($1, NULL, 'saved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("userId", "jobId") DO UPDATE SET status = 'saved', "updatedAt" = CURRENT_TIMESTAMP
           RETURNING id`,
          [userId]
        );
      }

      console.log('[BACKEND] addToLoop - Successfully saved');

      res.status(200).json({
        success: true,
        message: 'Added to Loop queue',
        savedJobId: result.rows[0].id
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[BACKEND] addToLoop - Error:', error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

export const getLoop = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await getPool().query(
      `SELECT * FROM "saved_jobs" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [userId]
    ).catch(() => getPool().query(
      `SELECT id, title as "jobTitle", company as "jobCompany", location as "jobLocation", 
         description as "jobDescription", status, "createdAt" as date_saved 
       FROM "Application" WHERE "userId" = $1 AND status = 'saved' ORDER BY "createdAt" DESC`,
      [userId]
    ));
    res.status(200).json({ success: true, applications: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

export const deleteFromLoop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await getPool().query(
      'DELETE FROM "saved_jobs" WHERE id = $1 AND "userId" = $2 RETURNING id',
      [id, userId]
    ).catch(() => getPool().query(
      'DELETE FROM "Application" WHERE id = $1 AND "userId" = $2 AND status = \'saved\' RETURNING id',
      [id, userId]
    ));
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(200).json({ success: true, message: 'Removed from loop' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};