import { getPool } from '../postgres.js';

const ensureJobTable = async (client) => {
  // Create Job table with all columns - compatible with both extension and aggregator
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
  
// Also create index for non-user-specific upserts (title, company, location)
   // Note: PostgreSQL treats NULL as distinct, so this will allow multiple rows with NULL location
   await client.query(`
     CREATE UNIQUE INDEX IF NOT EXISTS "Job_title_company_location_key"
     ON "Job" (title, company, location)
   `);
};

export const upsertJob = async (job) => {
  const client = await getPool().connect();
  try {
    await ensureJobTable(client);
    const result = await client.query(
      `INSERT INTO "Job" (title, company, location, description, url, source, salary, "employmentType", "isRemote", skills, benefits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (title, company, location) DO UPDATE SET
         description = EXCLUDED.description,
         url = EXCLUDED.url,
         salary = EXCLUDED.salary,
         "employmentType" = EXCLUDED."employmentType",
         "isRemote" = EXCLUDED."isRemote",
         skills = EXCLUDED.skills,
         benefits = EXCLUDED.benefits,
         source = EXCLUDED.source,
         "updatedAt" = CURRENT_TIMESTAMP
       RETURNING id, title, company, location, description, url, source, salary, "employmentType", "isRemote", skills, benefits, "createdAt", "updatedAt"`,
      [
        job.title,
        job.company,
        job.location,
        job.description,
        job.url,
        job.source || 'manual',
        job.salary,
        job.employmentType,
        !!job.isRemote,
        job.skills ? JSON.stringify(job.skills) : '[]',
        job.benefits ? JSON.stringify(job.benefits) : '[]',
      ]
    );
    console.log(`Inserted/Updated job with ID: ${result.rows[0].id}`);
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getAllJobs = async (filters = {}) => {
  const client = await getPool().connect();
  try {
    await ensureJobTable(client);
    
    // Include extension-specific columns
    let query = 'SELECT id, title, company, location, description, url, "jobUrl", source, salary, "employmentType", "isRemote", skills, benefits, "matchScore", "atsScore", "createdAt", "updatedAt", "userId" FROM "Job" WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filters.query) {
      query += ` AND (title ILIKE $${idx} OR company ILIKE $${idx} OR description ILIKE $${idx})`;
      params.push(`%${filters.query}%`);
      idx++;
    }
    if (filters.location) {
      query += ` AND location ILIKE $${idx}`;
      params.push(`%${filters.location}%`);
      idx++;
    }
    if (filters.remote) {
      query += ` AND "isRemote" = true`;
    }

    // Filter by userId if provided (for user's saved jobs from extension)
    if (filters.userId) {
      query += ` AND "userId" = $${idx}`;
      params.push(filters.userId);
      idx++;
    }

    query += ' ORDER BY "createdAt" DESC';
    const result = await client.query(query, params);
    console.log(`Fetched ${result.rows.length} jobs`);
    const countResult = await client.query('SELECT COUNT(*) FROM "Job" WHERE 1=1' + (filters.userId ? ` AND "userId" = $${params.length}` : ''), filters.userId ? [...params.slice(0, idx-1)] : []);
    const count = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(count / 10);
    return { jobs: result.rows, totalPages };
  } finally {
    client.release();
  }
};

// Get user's saved jobs (jobs with userId) - for JobsPage
export const getUserSavedJobs = async (userId) => {
  const client = await getPool().connect();
  try {
    await ensureJobTable(client);
    
    // Query jobs that belong to the user
    const query = `SELECT id, title, company, location, description, url, "jobUrl", source, salary, 
       "employmentType", "isRemote", skills, benefits, "matchScore", "atsScore", "missingSkills", "matchingSkills",
       "createdAt", "updatedAt", "userId"
       FROM "Job" 
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`;
    
    const result = await client.query(query, [userId]);
    console.log(`Fetched ${result.rows.length} saved jobs for user ${userId}`);
    return result.rows;
  } finally {
    client.release();
  }
};
