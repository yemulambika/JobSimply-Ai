-- Migration: Ensure all required tables exist

-- saved_jobs table for Loop feature
CREATE TABLE IF NOT EXISTS "saved_jobs" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  description TEXT,
  url TEXT,
  platform TEXT,
  status TEXT DEFAULT 'saved',
  "atsScore" INTEGER DEFAULT 0,
  "matchScore" INTEGER DEFAULT 0,
  skills JSONB,
  experience TEXT,
  salary TEXT,
  "resumeId" INTEGER REFERENCES "Resume"(id) ON DELETE SET NULL,
  "coverLetterId" INTEGER REFERENCES "CoverLetter"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for saved_jobs
CREATE UNIQUE INDEX IF NOT EXISTS "saved_jobs_userId_url_unique" ON "saved_jobs" ("userId", url) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS "saved_jobs_userId_idx" ON "saved_jobs" ("userId");
CREATE INDEX IF NOT EXISTS "saved_jobs_status_idx" ON "saved_jobs" (status);

-- updatedAt trigger for saved_jobs
CREATE OR REPLACE FUNCTION update_saved_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_saved_jobs_updated_at ON "saved_jobs";
CREATE TRIGGER update_saved_jobs_updated_at
  BEFORE UPDATE ON "saved_jobs"
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_jobs_updated_at();

-- Ensure Profile table exists
CREATE TABLE IF NOT EXISTS "Profile" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  firstName TEXT,
  lastName TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  linkedin TEXT,
  github TEXT,
  portfolio TEXT,
  "currentCompany" TEXT,
  "currentCtc" TEXT,
  "expectedCtc" TEXT,
  "noticePeriod" TEXT,
  "yearsOfExperience" TEXT,
  "visaStatus" TEXT,
  gender TEXT,
  "workAuthorization" TEXT,
  summary TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure Activity table exists
CREATE TABLE IF NOT EXISTS "Activity" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Activity_userId_idx" ON "Activity" ("userId");
CREATE INDEX IF NOT EXISTS "Activity_createdAt_idx" ON "Activity" ("createdAt");

-- Ensure Settings table exists
CREATE TABLE IF NOT EXISTS "Settings" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  preferences JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure CoverLetter table exists (lowercase)
CREATE TABLE IF NOT EXISTS "cover_letter" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "resumeId" INTEGER,
  "jobId" INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  company TEXT,
  position TEXT,
  "fileUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);