import pg from 'pg';

const { Pool } = pg;

let pool;
let migrationDone = false;

export const getPool = () => {
  if (!pool) {
    console.log('[DATABASE] Initializing pool, DATABASE_URL exists:', !!process.env.DATABASE_URL);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });
    
    // Test connection on creation
    pool.query('SELECT 1')
      .then(() => console.log('[DATABASE] Connection test successful'))
      .catch(err => console.error('[DATABASE] Connection failed:', err.message));
  }
  return pool;
};

const ensureResumeTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "Resume" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      "fileUrl" TEXT,
      "originalText" TEXT,
      "parsedData" JSONB,
      "skills" JSONB,
      "experience" JSONB,
      "education" JSONB,
      "projects" JSONB,
      "summary" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const ensureTailoredResumeTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "TailoredResume" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "resumeId" INTEGER NOT NULL,
      "jobId" INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      "jobDescription" TEXT,
      tone TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const ensureCoverLetterTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "CoverLetter" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "resumeId" INTEGER NOT NULL,
      "jobId" INTEGER,
      title TEXT,
      content TEXT,
      company TEXT,
      position TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const ensureJobTable = async (client) => {
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
};

const runMigration = async (client) => {
  if (migrationDone) return;
  const columns = [
    { name: '"isActive"', type: 'BOOLEAN NOT NULL DEFAULT false' },
    { name: '"originalText"', type: 'TEXT' },
    { name: '"parsedData"', type: 'JSONB' },
    { name: '"skills"', type: 'JSONB' },
    { name: '"experience"', type: 'JSONB' },
    { name: '"education"', type: 'JSONB' },
    { name: '"projects"', type: 'JSONB' },
    { name: '"summary"', type: 'TEXT' },
  ];
  for (const col of columns) {
    try {
      await client.query(`ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    } catch (err) {
      // Column may already exist
    }
  }
  migrationDone = true;
};

export const saveResumeMetadata = async ({ userId, title, fileUrl, originalText, parsedData, skills, experience, education, projects, summary }) => {
  const client = await getPool().connect();
  try {
    await ensureResumeTable(client);
    await runMigration(client);
    const result = await client.query(
      `INSERT INTO "Resume" ("userId", title, content, "fileUrl", "originalText", "parsedData", "skills", "experience", "education", "projects", "summary", "isActive")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
       RETURNING id, title, "fileUrl", "parsedData", "createdAt", "isActive"`,
      [
        userId,
        title,
        originalText || '',
        fileUrl,
        originalText || null,
        parsedData ? JSON.stringify(parsedData) : null,
        skills ? JSON.stringify(skills) : null,
        experience ? JSON.stringify(experience) : null,
        education ? JSON.stringify(education) : null,
        projects ? JSON.stringify(projects) : null,
        summary || null,
      ]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getUserResumes = async (userId) => {
  const client = await getPool().connect();
  try {
    await ensureResumeTable(client);
    await runMigration(client);
    const result = await client.query(
      `SELECT id, title, "fileUrl", "createdAt", "updatedAt", "isActive", "summary"
       FROM "Resume"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export const getResumeById = async (id, userId) => {
  const client = await getPool().connect();
  try {
    await ensureResumeTable(client);
    await runMigration(client);
    const result = await client.query(
      `SELECT id, title, "fileUrl", "originalText", "parsedData", "skills", "experience", "education", "projects", "summary", "isActive", "createdAt", "updatedAt"
       FROM "Resume"
       WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// Get user's active or latest resume
export const getLatestResume = async (userId) => {
  const client = await getPool().connect();
  try {
    await ensureResumeTable(client);
    await runMigration(client);
    
    // Try to get active resume first
    let result = await client.query(
      `SELECT id, title, "fileUrl", "originalText", "parsedData", "skills", "experience", "education", "projects", "summary", "isActive", "createdAt", "updatedAt"
       FROM "Resume"
       WHERE "userId" = $1 AND "isActive" = true
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [userId]
    );
    
    // If no active resume, get the latest resume
    if (result.rows.length === 0) {
      result = await client.query(
        `SELECT id, title, "fileUrl", "originalText", "parsedData", "skills", "experience", "education", "projects", "summary", "isActive", "createdAt", "updatedAt"
         FROM "Resume"
         WHERE "userId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 1`,
        [userId]
      );
    }
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const updateResumeTitle = async (id, userId, title) => {
  const client = await getPool().connect();
  try {
    await runMigration(client);
    const result = await client.query(
      `UPDATE "Resume" SET title = $1, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $2 AND "userId" = $3
       RETURNING id, title, "fileUrl", "createdAt", "updatedAt", "isActive"`,
      [title, id, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const deleteResume = async (id, userId) => {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `DELETE FROM "Resume" WHERE id = $1 AND "userId" = $2 RETURNING id`,
      [id, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const markResumeActive = async (id, userId) => {
  const client = await getPool().connect();
  try {
    await runMigration(client);
    // Deactivate all resumes for this user, then activate the selected one
    await client.query(
      `UPDATE "Resume" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $1`,
      [userId]
    );
    const result = await client.query(
      `UPDATE "Resume" SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1 AND "userId" = $2
       RETURNING id, title, "fileUrl", "createdAt", "updatedAt", "isActive"`,
      [id, userId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

export const replaceResume = async (id, userId, { title, fileUrl, originalText, parsedData, skills, experience, education, projects, summary }) => {
  const client = await getPool().connect();
  try {
    await runMigration(client);
    const result = await client.query(
      `UPDATE "Resume" SET title = $1, "fileUrl" = $2, content = $3, "originalText" = $4, "parsedData" = $5, "skills" = $6, "experience" = $7, "education" = $8, "projects" = $9, "summary" = $10, "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $11 AND "userId" = $12
       RETURNING id, title, "fileUrl", "parsedData", "createdAt", "updatedAt", "isActive"`,
      [
        title,
        fileUrl,
        originalText || '',
        originalText || null,
        parsedData ? JSON.stringify(parsedData) : null,
        skills ? JSON.stringify(skills) : null,
        experience ? JSON.stringify(experience) : null,
        education ? JSON.stringify(education) : null,
        projects ? JSON.stringify(projects) : null,
        summary || null,
        id,
        userId,
      ]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

// Save tailored resume to database
export const saveTailoredResume = async ({ userId, resumeId, jobId, title, content, jobDescription, tone }) => {
  const client = await getPool().connect();
  try {
    await ensureTailoredResumeTable(client);
    const result = await client.query(
      `INSERT INTO "TailoredResume" ("userId", "resumeId", "jobId", title, content, "jobDescription", tone, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING id, title, content, "jobDescription", tone, "createdAt"`,
      [userId, resumeId, jobId || null, title, JSON.stringify(content), jobDescription || null, tone || 'professional']
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Save cover letter to database
export const saveCoverLetter = async ({ userId, resumeId, jobId, title, content, company, position }) => {
  const client = await getPool().connect();
  try {
    await ensureCoverLetterTable(client);
    const result = await client.query(
      `INSERT INTO "CoverLetter" ("userId", "resumeId", "jobId", title, content, company, position, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, title, content, company, position, "createdAt"`,
      [userId, resumeId, jobId || null, title, content, company || null, position || null]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

// Get loop applications (saved jobs)
export const getLoopApplications = async (userId) => {
  const client = await getPool().connect();
  try {
    await ensureJobTable(client);
    const result = await client.query(
      `SELECT id, title, company, location, "jobUrl", source, "matchScore", "atsScore", "missingSkills", "matchingSkills"
       FROM "Job"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [userId]
    );
    return result.rows;
  } finally {
    client.release();
  }
};