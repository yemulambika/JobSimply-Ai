import { getPool } from '../postgres.js';

const ensureJobTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Job" (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      description TEXT,
      url TEXT,
      source TEXT DEFAULT 'manual',
      salary TEXT,
      "employmentType" TEXT,
      "isRemote" BOOLEAN DEFAULT false,
      skills JSONB,
      benefits JSONB,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(title, company, location)
    )
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
    let query = 'SELECT id, title, company, location, description, url, source, salary, "employmentType", "isRemote", skills, benefits, "createdAt", "updatedAt" FROM "Job" WHERE 1=1';
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

    query += ' ORDER BY "createdAt" DESC';
    const result = await client.query(query, params);
    console.log(`Fetched ${result.rows.length} jobs`);
    const countResult = await client.query('SELECT COUNT(*) FROM "Job" WHERE 1=1', params.slice(0, 3));
    const count = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(count / 10);
    return { jobs: result.rows, totalPages };
  } finally {
    client.release();
  }
};