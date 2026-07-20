import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  console.log('Starting direct PostgreSQL database migration...');
  const client = await pool.connect();
  try {
    // 1. Create User table
    console.log('Creating User table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Seed default user if not exists
    console.log('Seeding default user...');
    await client.query(`
      INSERT INTO "User" (id, email, "passwordHash", name, role)
      VALUES (1, 'auth@example.com', '$2a$10$xyz', 'Mock User', 'user')
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Create Resume table
    console.log('Creating Resume table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Resume" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
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
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Alter Resume table to add any missing columns if they don't exist
    console.log('Ensuring all parser columns exist on Resume table...');
    const alterColumns = [
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "originalText" TEXT',
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "parsedData" JSONB',
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "skills" JSONB',
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "experience" JSONB',
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "education" JSONB',
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "projects" JSONB',
      'ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "summary" TEXT',
    ];

    for (const query of alterColumns) {
      await client.query(query);
    }

    // 5. Create Job table with all columns expected by extension and controllers
    console.log('Creating Job table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Job" (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        salary TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns if they don't exist (for existing tables)
    console.log('Ensuring all columns exist on Job table...');
    const jobColumns = [
      'ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE',
      'ADD COLUMN IF NOT EXISTS experience TEXT',
      'ADD COLUMN IF NOT EXISTS "workMode" TEXT',
      'ADD COLUMN IF NOT EXISTS "jobUrl" TEXT',
      'ADD COLUMN IF NOT EXISTS "companyLogo" TEXT',
      'ADD COLUMN IF NOT EXISTS "postedDate" TEXT',
      'ADD COLUMN IF NOT EXISTS responsibilities TEXT',
      'ADD COLUMN IF NOT EXISTS qualifications TEXT',
      'ADD COLUMN IF NOT EXISTS "preferredSkills" JSONB',
      'ADD COLUMN IF NOT EXISTS "atsScore" INTEGER',
      'ADD COLUMN IF NOT EXISTS "matchingSkills" JSONB',
      'ADD COLUMN IF NOT EXISTS analysis JSONB',
      'ADD COLUMN IF NOT EXISTS "tailoredResumeId" INTEGER REFERENCES "TailoredResume"(id) ON DELETE SET NULL',
      'ADD COLUMN IF NOT EXISTS "coverLetterId" INTEGER REFERENCES "CoverLetter"(id) ON DELETE SET NULL',
      'ADD COLUMN IF NOT EXISTS "employmentType" TEXT',
      'ADD COLUMN IF NOT EXISTS "requiredSkills" JSONB',
      'ADD COLUMN IF NOT EXISTS keywords JSONB',
      'ADD COLUMN IF NOT EXISTS source TEXT DEFAULT \'manual\'',
      'ADD COLUMN IF NOT EXISTS "isRemote" BOOLEAN DEFAULT false',
      'ADD COLUMN IF NOT EXISTS "matchScore" INTEGER',
      'ADD COLUMN IF NOT EXISTS "missingSkills" JSONB',
      'ADD COLUMN IF NOT EXISTS skills JSONB',
      'ADD COLUMN IF NOT EXISTS benefits JSONB',
      'ADD COLUMN IF NOT EXISTS url TEXT',
    ];

    for (const col of jobColumns) {
      try {
        await client.query(`ALTER TABLE "Job" ${col}`);
      } catch (err) {
        console.log(`Column already exists or error: ${col}`);
      }
    }

    // Create unique index for ON CONFLICT (userId, jobUrl)
    console.log('Creating unique index for Job table...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobUrl_unique"
      ON "Job" ("userId", "jobUrl")
      WHERE "userId" IS NOT NULL AND "jobUrl" IS NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "Application" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
        "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'applied',
        notes TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "SavedJob" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "ResumeEmbedding" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
        embedding TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "JobEmbedding" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
        embedding TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Create AtsAnalysis table
    console.log('Creating AtsAnalysis table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AtsAnalysis" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
        "jobDescription" TEXT,
        score INTEGER NOT NULL,
        "keywordMatch" JSONB,
        "missingSkills" JSONB,
        "formattingIssues" JSONB,
        suggestions JSONB,
        "sectionAnalysis" JSONB,
        "readabilityScore" INTEGER,
        "recruiterReadiness" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Create CoverLetter table
    console.log('Creating CoverLetter table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CoverLetter" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "jobId" INTEGER REFERENCES "Job"(id) ON DELETE SET NULL,
        "resumeId" INTEGER REFERENCES "Resume"(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        company TEXT,
        position TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Create EmailTemplate table
    console.log('Creating EmailTemplate table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "EmailTemplate" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Create Notification table
    console.log('Creating Notification table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        data JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Create UserSettings table
    console.log('Creating UserSettings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "UserSettings" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'dark',
        "defaultTone" TEXT DEFAULT 'professional',
        "emailSignature" TEXT,
        "notificationPrefs" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Create InterviewPrep table
    console.log('Creating InterviewPrep table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "InterviewPrep" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        "questions" JSONB,
        "tips" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Create TailoredResume table
    console.log('Creating TailoredResume table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TailoredResume" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
        "jobId" INTEGER REFERENCES "Job"(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        "jobDescription" TEXT,
        tone TEXT DEFAULT 'professional',
        "matchScore" INTEGER,
        "keyChanges" JSONB,
        "highlightedSkills" JSONB,
        "optimizedExperience" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Add isActive column to Resume table
    console.log('Adding isActive column to Resume table...');
    await client.query(`
      ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false
    `);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
