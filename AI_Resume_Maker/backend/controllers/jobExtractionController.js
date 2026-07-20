import { getPool } from '../services/postgres.js';
import { getLatestResume } from '../services/postgres.js';
import { ATSScoringEngine } from '../services/ats/ATSScoringEngine.js';
import { RecommendationEngine } from '../services/ats/RecommendationEngine.js';

// ATS Scoring Engine instance
const scoringEngine = new ATSScoringEngine();
const recommendationEngine = new RecommendationEngine();

// Extension sends job JSON, backend stores it and returns analysis
export const extractJobAndAnalyze = async (req, res, next) => {
  console.log('[BACKEND] ========== extractJobAndAnalyze START ==========');
  console.log('[BACKEND] Extract request - req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'null');
  console.log('[BACKEND] Extract request - req.validated:', req.validated ? { title: req.validated.title, company: req.validated.company } : 'null');
  console.log('[BACKEND] Extract request - req.body:', req.body ? { title: req.body.title, company: req.body.company } : 'null');
  
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
  
  // Step 2: Use validated body (already validated by middleware)
  const { 
    title, company, location, salary, experience, employmentType, workMode,
    description, responsibilities, qualifications, requiredSkills, preferredSkills,
    keywords, source, jobUrl, companyLogo, postedDate 
  } = req.validated || {};
  
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
    
    // Create Job table if it doesn't exist (with all columns needed for extension)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Job" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER,
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
    
    // Create unique index for ON CONFLICT (userId, jobUrl) - needed for upsert when jobUrl exists
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobUrl_unique"
      ON "Job" ("userId", "jobUrl")
      WHERE "userId" IS NOT NULL AND "jobUrl" IS NOT NULL
    `);

// Create unique index for ON CONFLICT (title, company, location) - needed for upsert when jobUrl is missing
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Job_title_company_location_key"
      ON "Job" (title, company, location)
    `);

    // Insert the job (upsert to avoid duplicates)
    console.log('[BACKEND] extractJobAndAnalyze - Inserting job into database');
    const jobResult = await client.query(
      `INSERT INTO "Job" ("userId", title, company, location, salary, experience, 
         "employmentType", "workMode", description, responsibilities, qualifications, 
         "requiredSkills", "preferredSkills", keywords, source, "jobUrl", "companyLogo", "postedDate")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (title, company, location) DO UPDATE 
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
      console.log('[BACKEND] extractJobAndAnalyze - Resume originalText length:', resume.originalText?.length || 0);
      console.log('[BACKEND] extractJobAndAnalyze - Resume parsedData skills:', resume.parsedData?.skills || resume.skills);
      
      const analysis = scoringEngine.analyze(resume.originalText || '', { 
        title, company, description, location, requiredSkills, keywords 
      });
      
      console.log('[BACKEND] extractJobAndAnalyze - Analysis completed');
      console.log('[BACKEND] extractJobAndAnalyze - ATS Score:', analysis.atsScore);
      console.log('[BACKEND] extractJobAndAnalyze - Skills Score:', analysis.scores.skills);
      console.log('[BACKEND] extractJobAndAnalyze - Experience Score:', analysis.scores.experience);
      console.log('[BACKEND] extractJobAndAnalyze - Project Score:', analysis.scores.projects);
      console.log('[BACKEND] extractJobAndAnalyze - Education Score:', analysis.scores.education);
      
      matchScore = analysis.atsScore;
      atsScore = analysis.atsScore;
      missingSkills = analysis.details.missingSkills;
      matchingSkills = analysis.details.matchedSkills;
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