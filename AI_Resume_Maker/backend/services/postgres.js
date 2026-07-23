import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

let realPool = null;
let useFallback = false;
let migrationDone = false;

// In-memory database store for local dev mode when PostgreSQL is not running
const inMemoryStore = {
  users: [
    {
      id: 1,
      email: 'ambikayemul2001@gmail.com',
      // Default password: 'Ambika@04*'
      passwordHash: bcrypt.hashSync('Ambika@04*', 10),
      name: 'Ambika Yemul',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      email: 'auth@example.com',
      passwordHash: bcrypt.hashSync('password123', 10),
      name: 'Mock User',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ],
  resumes: [],
  jobs: [],
  tailoredResumes: [],
  coverLetters: [],
  applications: [],
  savedJobs: [],
  nextUser: 3,
  nextResume: 1,
  nextJob: 1,
  nextTailored: 1,
  nextCoverLetter: 1,
  nextApp: 1,
};

// In-memory SQL executor for basic CRUD queries
const executeInMemoryQuery = async (text, params = []) => {
  const sql = text.trim();
  const normalizedSql = sql.replace(/\s+/g, ' ');

  // 1. Connection test / schema queries
  if (/^SELECT 1/i.test(normalizedSql) || 
      /^CREATE TABLE/i.test(normalizedSql) || 
      /^ALTER TABLE/i.test(normalizedSql) || 
      /^CREATE UNIQUE INDEX/i.test(normalizedSql)) {
    return { rows: [] };
  }

  // 2. USER QUERIES
  if (/FROM "User"/i.test(normalizedSql)) {
    if (/WHERE email = \$1/i.test(normalizedSql)) {
      const email = (params[0] || '').toLowerCase();
      const user = inMemoryStore.users.find(u => u.email.toLowerCase() === email);
      return { rows: user ? [{ ...user }] : [] };
    }
    if (/WHERE id = \$1/i.test(normalizedSql)) {
      const id = parseInt(params[0], 10);
      const user = inMemoryStore.users.find(u => u.id === id);
      return { rows: user ? [{ ...user }] : [] };
    }
  }

  if (/INSERT INTO "User"/i.test(normalizedSql)) {
    // ON CONFLICT check
    if (/ON CONFLICT/i.test(normalizedSql)) {
      return { rows: [] };
    }
    const email = params[0];
    const passwordHash = params[1];
    const name = params[2] || null;
    const role = 'user';

    // Check if user already exists
    let user = inMemoryStore.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
      user = {
        id: inMemoryStore.nextUser++,
        email,
        passwordHash,
        name,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryStore.users.push(user);
    }
    return { rows: [{ id: user.id, email: user.email, name: user.name, role: user.role }] };
  }

  // 3. RESUME QUERIES
  if (/FROM "Resume"/i.test(normalizedSql)) {
    if (/WHERE "userId" = \$1 AND "isActive" = true/i.test(normalizedSql)) {
      const userId = parseInt(params[0], 10);
      const resume = inMemoryStore.resumes.find(r => r.userId === userId && r.isActive);
      return { rows: resume ? [{ ...resume }] : [] };
    }
    if (/WHERE "userId" = \$1/i.test(normalizedSql)) {
      const userId = parseInt(params[0], 10);
      const userResumes = inMemoryStore.resumes.filter(r => r.userId === userId);
      return { rows: userResumes };
    }
    if (/WHERE id = \$1 AND "userId" = \$2/i.test(normalizedSql)) {
      const id = parseInt(params[0], 10);
      const userId = parseInt(params[1], 10);
      const resume = inMemoryStore.resumes.find(r => r.id === id && r.userId === userId);
      return { rows: resume ? [{ ...resume }] : [] };
    }
  }

  if (/INSERT INTO "Resume"/i.test(normalizedSql)) {
    const userId = parseInt(params[0], 10);
    const title = params[1];
    const content = params[2] || '';
    const fileUrl = params[3] || null;
    const originalText = params[4] || null;
    const parsedData = params[5] ? JSON.parse(params[5]) : null;
    const skills = params[6] ? JSON.parse(params[6]) : null;
    const experience = params[7] ? JSON.parse(params[7]) : null;
    const education = params[8] ? JSON.parse(params[8]) : null;
    const projects = params[9] ? JSON.parse(params[9]) : null;
    const summary = params[10] || null;

    const resume = {
      id: inMemoryStore.nextResume++,
      userId,
      title,
      content,
      fileUrl,
      originalText,
      parsedData,
      skills,
      experience,
      education,
      projects,
      summary,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryStore.resumes.push(resume);
    return { rows: [{ ...resume }] };
  }

  if (/UPDATE "Resume"/i.test(normalizedSql)) {
    if (/SET "isActive" = false/i.test(normalizedSql)) {
      const userId = parseInt(params[0], 10);
      inMemoryStore.resumes.forEach(r => {
        if (r.userId === userId) r.isActive = false;
      });
      return { rows: [] };
    }
    if (/SET "isActive" = true/i.test(normalizedSql)) {
      const id = parseInt(params[0], 10);
      const userId = parseInt(params[1], 10);
      const resume = inMemoryStore.resumes.find(r => r.id === id && r.userId === userId);
      if (resume) resume.isActive = true;
      return { rows: resume ? [{ ...resume }] : [] };
    }
  }

  if (/DELETE FROM "Resume"/i.test(normalizedSql)) {
    const id = parseInt(params[0], 10);
    const userId = parseInt(params[1], 10);
    const idx = inMemoryStore.resumes.findIndex(r => r.id === id && r.userId === userId);
    if (idx !== -1) {
      const deleted = inMemoryStore.resumes.splice(idx, 1)[0];
      return { rows: [{ id: deleted.id }] };
    }
    return { rows: [] };
  }

  // 4. JOB QUERIES
  if (/FROM "Job"/i.test(normalizedSql)) {
    if (/WHERE "userId" = \$1/i.test(normalizedSql)) {
      const userId = parseInt(params[0], 10);
      const userJobs = inMemoryStore.jobs.filter(j => j.userId === userId);
      return { rows: userJobs };
    }
    return { rows: [...inMemoryStore.jobs] };
  }

  if (/INSERT INTO "Job"/i.test(normalizedSql)) {
    const job = {
      id: inMemoryStore.nextJob++,
      userId: params[0] || null,
      title: params[1] || 'Job Title',
      company: params[2] || 'Company',
      createdAt: new Date(),
    };
    inMemoryStore.jobs.push(job);
    return { rows: [job] };
  }

  // Fallback default response
  return { rows: [] };
};

// Safe pool wrapper
const fallbackPool = {
  query: async (text, params) => {
    if (!useFallback && realPool) {
      try {
        return await realPool.query(text, params);
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('connect ECONNREFUSED')) {
          console.warn('[DATABASE] PostgreSQL connection refused. Switching to local in-memory store fallback.');
          useFallback = true;
          return await executeInMemoryQuery(text, params);
        }
        throw err;
      }
    }
    return await executeInMemoryQuery(text, params);
  },
  connect: async () => {
    if (!useFallback && realPool) {
      try {
        const client = await realPool.connect();
        const originalQuery = client.query.bind(client);
        client.query = async (text, params) => {
          try {
            return await originalQuery(text, params);
          } catch (err) {
            if (err.code === 'ECONNREFUSED' || err.message?.includes('connect ECONNREFUSED')) {
              console.warn('[DATABASE] PostgreSQL connection refused. Using in-memory fallback.');
              useFallback = true;
              return await executeInMemoryQuery(text, params);
            }
            throw err;
          }
        };
        return client;
      } catch (err) {
        console.warn('[DATABASE] PostgreSQL client connect failed (ECONNREFUSED). Using in-memory fallback.');
        useFallback = true;
      }
    }
    // Fallback client mock
    return {
      query: async (text, params) => executeInMemoryQuery(text, params),
      release: () => {},
    };
  },
  on: () => {},
};

export const getPool = () => {
  if (!realPool && !useFallback) {
    if (!process.env.DATABASE_URL) {
      console.log('[DATABASE] No DATABASE_URL specified. Initializing local in-memory database fallback.');
      useFallback = true;
    } else {
      console.log('[DATABASE] Initializing PostgreSQL pool with DATABASE_URL.');
      realPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      });

      realPool.query('SELECT 1')
        .then(() => console.log('[DATABASE] PostgreSQL connection successful.'))
        .catch(err => {
          console.warn('[DATABASE] PostgreSQL connection failed:', err.message, '- activating local in-memory fallback.');
          useFallback = true;
        });
    }
  }

  return fallbackPool;
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

export const getLatestResume = async (userId) => {
  const client = await getPool().connect();
  try {
    await ensureResumeTable(client);
    await runMigration(client);
    
    let result = await client.query(
      `SELECT id, title, "fileUrl", "originalText", "parsedData", "skills", "experience", "education", "projects", "summary", "isActive", "createdAt", "updatedAt"
       FROM "Resume"
       WHERE "userId" = $1 AND "isActive" = true
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [userId]
    );
    
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