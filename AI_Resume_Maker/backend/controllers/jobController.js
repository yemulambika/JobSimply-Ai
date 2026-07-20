import { getPool } from '../services/postgres.js';
import { aggregateJobs } from '../services/jobs/JobAggregator.js';
import { getAllJobs, getUserSavedJobs } from '../services/jobs/JobStorage.js';

// Ensure Job table exists
const ensureJobTable = async (client) => {
  // Create Job table with all columns needed for extension and aggregator compatibility
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
      source TEXT DEFAULT 'manual',
      url TEXT,
      "jobUrl" TEXT,
      "companyLogo" TEXT,
      "postedDate" TEXT,
      "isRemote" BOOLEAN DEFAULT false,
      "matchScore" INTEGER,
      "atsScore" INTEGER,
      "missingSkills" JSONB,
      "matchingSkills" JSONB,
      analysis JSONB,
      "tailoredResumeId" INTEGER,
      "coverLetterId" INTEGER,
      skills JSONB,
      benefits JSONB,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create unique index for ON CONFLICT (userId, jobUrl)
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobUrl_unique"
    ON "Job" ("userId", "jobUrl")
    WHERE "userId" IS NOT NULL AND "jobUrl" IS NOT NULL
  `);
  
  // Also create index for title/company/location upserts
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Job_title_company_location_key"
    ON "Job" (title, company, COALESCE(location, ''))
  `);
};

// GET /jobs/aggregate?query=...&location=...&remoteOnly=true|false
export const aggregateAndStoreJobs = async (req, res, next) => {
  try {
    console.log('Fetching jobs...');
    const { query, location, remoteOnly } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter is required' });
    }
    const jobs = await aggregateJobs(query, location || '', remoteOnly === 'true');
    console.log(`Received ${jobs.length} jobs`);
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
};

// GET /jobs - List all jobs
export const listStoredJobs = async (req, res, next) => {
  try {
    const { query, location, remote } = req.query;
    const filters = {};
    if (query) filters.query = query;
    if (location) filters.location = location;
    if (remote) filters.remote = true;
    const { jobs, totalPages } = await getAllJobs(filters);
    console.log(`Returning ${jobs.length} jobs`);
    res.status(200).json({ success: true, jobs, totalPages });
  } catch (error) {
    next(error);
  }
};

// GET /jobs/:id - Get job by ID (for TailoredJobPage)
export const getJobByIdHandler = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const userId = req.user?.id;
    const job = await getJobByIdFromDb(jobId, userId);
    if (!job) {
      return res.status(400).json({ message: 'Job not found' });
    }
    res.status(200).json({ 
      ...job,
      // Parse analysis if it exists
      analysis: job.analysis ? (typeof job.analysis === 'string' ? JSON.parse(job.analysis) : job.analysis) : null,
      missingSkills: job.missingSkills ? (typeof job.missingSkills === 'string' ? JSON.parse(job.missingSkills) : job.missingSkills) : [],
      matchingSkills: job.matchingSkills ? (typeof job.matchingSkills === 'string' ? JSON.parse(job.matchingSkills) : job.matchingSkills) : [],
      requiredSkills: job.requiredSkills ? (typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills) : job.requiredSkills) : [],
      keywords: job.keywords ? (typeof job.keywords === 'string' ? JSON.parse(job.keywords) : job.keywords) : []
    });
  } catch (error) {
    next(error);
  }
};

async function getJobByIdFromDb(id, userId = null) {
  const client = await getPool().connect();
  try {
    await ensureJobTable(client);
    // If userId is provided, filter by it
    if (userId) {
      const result = await client.query('SELECT * FROM "Job" WHERE id = $1 AND "userId" = $2', [id, userId]);
      return result.rows[0];
    }
    const result = await client.query('SELECT * FROM "Job" WHERE id = $1', [id]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// GET /jobs/saved - List jobs saved by user (from extension)
export const listUserSavedJobs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const jobs = await getUserSavedJobs(userId);
    console.log(`Returning ${jobs.length} saved jobs for user ${userId}`);
    res.status(200).json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};