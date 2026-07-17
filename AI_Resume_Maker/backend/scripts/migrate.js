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

    // Advance the SERIAL sequence past the manually-seeded id=1 so new
    // registrations don't collide with the default user (fixes User_pkey error).
    console.log('Syncing User id sequence...');
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('"User"', 'id'),
        GREATEST((SELECT MAX(id) FROM "User"), 1)
      )
    `);

    // 2b. Extended profile fields on User (used by profileController autofill)
    console.log('Ensuring extended profile columns on User table...');
    await client.query(`
      ALTER TABLE "User"
        ADD COLUMN IF NOT EXISTS "firstName" TEXT,
        ADD COLUMN IF NOT EXISTS "lastName" TEXT,
        ADD COLUMN IF NOT EXISTS phone TEXT,
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS state TEXT,
        ADD COLUMN IF NOT EXISTS country TEXT,
        ADD COLUMN IF NOT EXISTS zip TEXT,
        ADD COLUMN IF NOT EXISTS linkedin TEXT,
        ADD COLUMN IF NOT EXISTS github TEXT,
        ADD COLUMN IF NOT EXISTS portfolio TEXT,
        ADD COLUMN IF NOT EXISTS "currentCompany" TEXT,
        ADD COLUMN IF NOT EXISTS designation TEXT,
        ADD COLUMN IF NOT EXISTS experience JSONB,
        ADD COLUMN IF NOT EXISTS education JSONB,
        ADD COLUMN IF NOT EXISTS skills JSONB,
        ADD COLUMN IF NOT EXISTS certifications JSONB
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

    // 5. Create Job table with all columns expected by JobStorage.js
    console.log('Creating Job table...');
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

    // 14. Ensure Application has a unique (userId, jobId) for ON CONFLICT fallback
    console.log('Ensuring Application unique constraint...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Application_userId_jobId_key'
        ) THEN
          ALTER TABLE "Application"
            ADD CONSTRAINT "Application_userId_jobId_key" UNIQUE ("userId", "jobId");
        END IF;
      END $$;
    `);

    // ---------------------------------------------------------------------
    // Repository-layer tables (snake_case). These are queried directly by
    // repositories/index.js, aiPipeline.js, jobAnalysisController.js and
    // atsExporter.js but were previously never created.
    // ---------------------------------------------------------------------

    // 15. master_resume
    console.log('Creating master_resume table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "master_resume" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "parsedData" JSONB,
        "originalText" TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId")
      )
    `);

    // 16. job_analyses
    console.log('Creating job_analyses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "job_analyses" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        title TEXT,
        company TEXT,
        location TEXT,
        salary TEXT,
        "employmentType" TEXT,
        "isRemote" BOOLEAN DEFAULT false,
        "atsKeywords" JSONB,
        "requiredSkills" JSONB,
        "preferredSkills" JSONB,
        "niceToHave" JSONB,
        industry TEXT,
        responsibilities TEXT,
        description TEXT,
        url TEXT,
        source TEXT,
        "matchScore" INTEGER,
        "atsScore" INTEGER,
        "experienceMatch" INTEGER,
        "educationMatch" INTEGER,
        "skillsMatch" INTEGER,
        "projectMatch" INTEGER,
        "missingSkills" JSONB,
        "matchedSkills" JSONB,
        "resumeWeaknesses" JSONB,
        "resumeStrengths" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 17. resume_versions
    console.log('Creating resume_versions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "resume_versions" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "masterResumeId" INTEGER REFERENCES "master_resume"(id) ON DELETE SET NULL,
        "jobId" INTEGER,
        "tailoredData" JSONB,
        "atsScore" INTEGER,
        "matchScore" INTEGER,
        "missingSkills" JSONB,
        "matchedSkills" JSONB,
        changes JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 18. saved_jobs (superset of columns used by repo + jobAnalysisController)
    console.log('Creating saved_jobs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "saved_jobs" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        title TEXT,
        company TEXT,
        location TEXT,
        salary TEXT,
        experience TEXT,
        "employmentType" TEXT,
        "isRemote" BOOLEAN DEFAULT false,
        skills JSONB,
        description TEXT,
        url TEXT,
        source TEXT,
        platform TEXT,
        "atsScore" INTEGER,
        "matchScore" INTEGER,
        status TEXT DEFAULT 'saved',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", url)
      )
    `);

    // 19. cover_letters
    console.log('Creating cover_letters table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "cover_letters" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "masterResumeId" INTEGER REFERENCES "master_resume"(id) ON DELETE SET NULL,
        "jobId" INTEGER,
        title TEXT,
        company TEXT,
        position TEXT,
        content TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 20. activity
    console.log('Creating activity table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "activity" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 21. ExportHistory
    console.log('Creating ExportHistory table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ExportHistory" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "resumeId" INTEGER,
        "tailoredResumeId" INTEGER,
        "coverLetterId" INTEGER,
        format TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
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
