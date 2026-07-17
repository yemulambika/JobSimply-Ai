import { getPool } from '../services/postgres.js';
import { aggregateJobs } from '../services/jobs/JobAggregator.js';
import { getAllJobs } from '../services/jobs/JobStorage.js';
import { fetchAndSaveJobs } from '../services/jobCron.js';

// Ensure Job table exists
const ensureJobTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Job" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      description TEXT,
      url TEXT,
      "jobUrl" TEXT,
      source TEXT DEFAULT 'manual',
      salary TEXT,
      "employmentType" TEXT,
      "workMode" TEXT,
      "isRemote" BOOLEAN DEFAULT false,
      "requiredSkills" JSONB,
      "preferredSkills" JSONB,
      keywords JSONB,
      "matchScore" INTEGER,
      "atsScore" INTEGER,
      "missingSkills" JSONB,
      "matchingSkills" JSONB,
      analysis JSONB,
      "tailoredResumeId" INTEGER,
      benefits JSONB,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// POST /jobs/fetch-now — manually trigger the background job fetcher
export const triggerFetchNow = async (req, res, next) => {
  try {
    const { query = '' } = req.body || {};
    // Run in background so HTTP response is immediate
    fetchAndSaveJobs(query).catch(err =>
      console.error('[JobCron] Manual trigger error:', err.message)
    );
    res.status(202).json({
      success: true,
      message: 'Job fetch started in background. Check /api/jobs in a few seconds.',
    });
  } catch (error) {
    next(error);
  }
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