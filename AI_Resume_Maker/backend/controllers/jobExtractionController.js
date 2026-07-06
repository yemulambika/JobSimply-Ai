import { getPool } from '../services/postgres.js';
import { getLatestResume } from '../services/postgres.js';

// Extension sends job JSON, backend stores it and returns analysis
export const extractJobAndAnalyze = async (req, res, next) => {
  console.log('[BACKEND] extractJobAndAnalyze - Incoming request:', { 
    title: req.body?.title, 
    company: req.body?.company,
    source: req.body?.source 
  });
  
  // Step 1: Verify JWT middleware
  if (!req.user) {
    console.log('[BACKEND] extractJobAndAnalyze - No auth middleware');
    return res.status(401).json({ 
      success: false, 
      stage: 'auth',
      error: 'Authentication required' 
    });
  }
  
  const userId = req.user.id;
  console.log('[BACKEND] extractJobAndAnalyze - JWT verified, userId:', userId);
  
  // Step 2: Validate request body
  const { 
    title, company, location, salary, experience, employmentType, workMode,
    description, responsibilities, qualifications, requiredSkills, preferredSkills,
    keywords, source, jobUrl, companyLogo, postedDate 
  } = req.body || {};
  
  console.log('[BACKEND] extractJobAndAnalyze - Request body parsed:', { title, company, source });

  // Validate required fields
  if (!title || !company) {
    console.log('[BACKEND] extractJobAndAnalyze - Missing required fields');
    return res.status(400).json({ 
      success: false, 
      stage: 'validation',
      error: 'Job title and company are required' 
    });
  }

  // Step 3: Database operations
  const client = await getPool().connect();
  
  try {
    console.log('[BACKEND] extractJobAndAnalyze - Creating Job table if needed');
    
    // Create Job table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Job" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        salary TEXT,
        experience TEXT,
        "employmentType" TEXT,
        "workMode" TEXT,
        description TEXT,
        responsibilities TEXT,
        qualifications TEXT,
        "requiredSkills" JSONB,
        "preferredSkills" JSONB,
        keywords JSONB,
        source TEXT,
        "jobUrl" TEXT,
        "companyLogo" TEXT,
        "postedDate" TEXT,
        "matchScore" INTEGER,
        "atsScore" INTEGER,
        "missingSkills" JSONB,
        "matchingSkills" JSONB,
        analysis JSONB,
        "tailoredResumeId" INTEGER,
        "coverLetterId" INTEGER,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert the job (upsert to avoid duplicates)
    console.log('[BACKEND] extractJobAndAnalyze - Inserting job into database');
    const jobResult = await client.query(
      `INSERT INTO "Job" ("userId", title, company, location, salary, experience, 
         "employmentType", "workMode", description, responsibilities, qualifications, 
         "requiredSkills", "preferredSkills", keywords, source, "jobUrl", "companyLogo", "postedDate")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT ("userId", "jobUrl") DO UPDATE 
       SET title = EXCLUDED.title, company = EXCLUDED.company, 
           location = EXCLUDED.location, description = EXCLUDED.description,
           "updatedAt" = CURRENT_TIMESTAMP
       RETURNING id, title, company, location, description, "userId"`,
      [
        userId, title, company, location || '', salary || '', experience || '',
        employmentType || '', workMode || '', description || '', responsibilities || '', qualifications || '',
        requiredSkills ? JSON.stringify(requiredSkills) : null,
        preferredSkills ? JSON.stringify(preferredSkills) : null,
        keywords ? JSON.stringify(keywords) : null,
        source || '', jobUrl || '', companyLogo || '', postedDate || ''
      ]
    );

    const jobId = jobResult.rows[0]?.id;
    console.log('[BACKEND] extractJobAndAnalyze - Job saved with ID:', jobId);

    if (!jobId) {
      console.log('[BACKEND] extractJobAndAnalyze - Database insert failed');
      return res.status(500).json({ 
        success: false, 
        stage: 'database',
        error: 'Failed to save job to database' 
      });
    }

    // Step 4: Get user's master resume for analysis
    console.log('[BACKEND] extractJobAndAnalyze - Getting latest resume for user');
    const resume = await getLatestResume(userId);

    // Default analysis if no resume
    let matchScore = 0;
    let atsScore = 0;
    let missingSkills = requiredSkills || [];
    let matchingSkills = [];

    // Step 5: Run analysis if resume exists
    if (resume) {
      console.log('[BACKEND] extractJobAndAnalyze - Resume found, running analysis');
      const analysis = runFullAtsAnalysis(resume, { 
        title, company, description, location, requiredSkills, keywords 
      });
      
      matchScore = analysis.matchScore;
      atsScore = analysis.atsScore;
      missingSkills = analysis.missingSkills;
      matchingSkills = analysis.matchingSkills;
    } else {
      console.log('[BACKEND] extractJobAndAnalyze - No resume found, using basic analysis');
    }

    // Step 6: Update job with analysis results
    console.log('[BACKEND] extractJobAndAnalyze - Updating job with analysis');
    await client.query(
      `UPDATE "Job" SET "matchScore" = $1, "atsScore" = $2, 
         "missingSkills" = $3, "matchingSkills" = $4, "analysis" = $5
       WHERE id = $6`,
      [
        matchScore, atsScore,
        JSON.stringify(missingSkills), 
        JSON.stringify(matchingSkills),
        JSON.stringify({ matchScore, atsScore, missingSkills, matchingSkills }),
        jobId
      ]
    );

    // Step 7: Return structured response
    const result = {
      success: true,
      jobId: jobId,
      extractedJob: {
        title, company, location, description, source
      },
      matchScore: matchScore,
      atsScore: atsScore,
      missingSkills: missingSkills,
      matchingSkills: matchingSkills
    };

    console.log('[BACKEND] extractJobAndAnalyze - Returning 200 response:', { jobId, matchScore, atsScore });
    return res.status(200).json(result);

  } catch (error) {
    console.error('[BACKEND] extractJobAndAnalyze - Error:', error.message);
    console.error('[BACKEND] extractJobAndAnalyze - Stack:', error.stack);
    
    // Return structured error
    return res.status(500).json({ 
      success: false, 
      stage: 'unknown',
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
    console.log('[BACKEND] extractJobAndAnalyze - Database connection released');
  }
};

// Full ATS analysis
function runFullAtsAnalysis(resume, job) {
  const resumeText = resume.originalText || '';
  const jobDescription = job.description || '';
  
  const jobKeywords = extractAllKeywords(jobDescription, job.requiredSkills, job.keywords);
  const resumeSkills = Array.isArray(resume.skills) ? resume.skills : [];

  const matchingSkills = jobKeywords.skills.filter(skill => 
    resumeSkills.some(rs => rs.toLowerCase().includes(skill.toLowerCase()))
  );
  const missingSkills = jobKeywords.skills.filter(skill => 
    !matchingSkills.some(ms => ms.toLowerCase() === skill.toLowerCase())
  );

  return {
    atsScore: Math.min(100, Math.max(0, 50 + (matchingSkills.length * 10))),
    matchScore: Math.round((matchingSkills.length / (jobKeywords.skills.length || 1)) * 100),
    missingSkills: missingSkills.slice(0, 15),
    matchingSkills: matchingSkills.slice(0, 15),
    recommendedKeywords: jobKeywords.all.slice(0, 15),
    experienceMatch: calculateExperienceMatch(resume, jobDescription),
    projectMatch: calculateProjectMatch(resume.projects || [], jobDescription),
    suggestions: missingSkills.length > 0 
      ? [`Add skills: ${missingSkills.slice(0,3).join(', ')}`] 
      : ['Your resume matches this job well!']
  };
}

function extractAllKeywords(text, requiredSkills = [], keywords = []) {
  const commonSkillKeywords = [
    'javascript', 'react', 'vue', 'angular', 'nodejs', 'node.js', 'python', 'java', 'csharp', 'c++',
    'sql', 'mongodb', 'postgresql', 'mysql', 'aws', 'docker', 'kubernetes', 'git', 'typescript',
    'html', 'css', 'nextjs', 'express', 'django', 'flask', 'spring', 'ruby', 'php', 'swift',
    'kotlin', 'go', 'rust', 'scala', 'r', 'tensorflow', 'pytorch', 'machine learning', 'ai',
    'rest api', 'graphql', 'microservices', 'azure', 'gcp', 'cloud', 'devops', 'ci/cd',
    'agile', 'scrum', 'jira', 'linux', 'bash', 'shell', 'firebase', 'redux', 'tailwind',
    'bootstrap', 'jquery', 'sass', 'less', 'webpack', 'vite', 'npm', 'yarn', 'pnpm'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Combine required skills, extracted keywords, and common skills found in description
  const skills = [
    ...(requiredSkills || []),
    ...commonSkillKeywords.filter(skill => lowerText.includes(skill.toLowerCase()))
  ];
  
  // Remove duplicates
  const uniqueSkills = [...new Set(skills.map(s => s.toLowerCase()))];
  
  return {
    skills: uniqueSkills,
    all: keywords.length > 0 ? keywords : (text.match(/\b[a-zA-Z]{4,}/g) || [])
  };
}

function calculateExperienceMatch(resume, desc) { 
  // Simplified - check if resume has experience
  return resume.experience?.length > 0 ? 70 : 30; 
}

function calculateProjectMatch(projects, desc) { 
  return projects?.length > 0 ? 60 : 40; 
}