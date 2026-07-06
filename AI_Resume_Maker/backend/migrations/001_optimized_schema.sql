-- Migration: Optimize JobSimply database schema
-- Add unique constraints, indexes, foreign keys, cascade deletes, timestamps

-- ============================================
-- Users Table - Extended Profile Fields
-- ============================================
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
  ADD COLUMN IF NOT EXISTS certifications JSONB,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- Resume Table - Proper Indexes and Constraints
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS "Resume_userId_isActive_unique" 
  ON "Resume" ("userId") 
  WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "Resume_userId_idx" ON "Resume" ("userId");
CREATE INDEX IF NOT EXISTS "Resume_createdAt_idx" ON "Resume" ("createdAt");

-- ============================================
-- Job Table - Proper Indexes and Constraints
-- ============================================
CREATE INDEX IF NOT EXISTS "Job_company_idx" ON "Job" (company);
CREATE INDEX IF NOT EXISTS "Job_source_idx" ON "Job" (source);
CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job" ("createdAt");

-- ============================================
-- Application Table - Proper Foreign Keys and Cascade
-- ============================================
ALTER TABLE "Application" 
  DROP CONSTRAINT IF EXISTS "Application_jobId_fkey",
  ADD CONSTRAINT "Application_jobId_fkey" 
  FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE;

ALTER TABLE "Application" 
  ADD CONSTRAINT IF NOT EXISTS "Application_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "Application_userId_idx" ON "Application" ("userId");
CREATE INDEX IF NOT EXISTS "Application_jobId_idx" ON "Application" ("jobId");
CREATE INDEX IF NOT EXISTS "Application_status_idx" ON "Application" (status);

-- ============================================
-- TailoredResume Table - Proper Foreign Keys
-- ============================================
ALTER TABLE "TailoredResume" 
  ADD CONSTRAINT IF NOT EXISTS "TailoredResume_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "TailoredResume" 
  ADD CONSTRAINT IF NOT EXISTS "TailoredResume_resumeId_fkey" 
  FOREIGN KEY ("resumeId") REFERENCES "Resume"(id) ON DELETE CASCADE;

ALTER TABLE "TailoredResume" 
  ADD CONSTRAINT IF NOT EXISTS "TailoredResume_jobId_fkey" 
  FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "TailoredResume_userId_idx" ON "TailoredResume" ("userId");
CREATE INDEX IF NOT EXISTS "TailoredResume_resumeId_idx" ON "TailoredResume" ("resumeId");

-- ============================================
-- CoverLetter Table - Proper Foreign Keys
-- ============================================
ALTER TABLE "CoverLetter" 
  ADD CONSTRAINT IF NOT EXISTS "CoverLetter_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "CoverLetter" 
  ADD CONSTRAINT IF NOT EXISTS "CoverLetter_resumeId_fkey" 
  FOREIGN KEY ("resumeId") REFERENCES "Resume"(id) ON DELETE CASCADE;

ALTER TABLE "CoverLetter" 
  ADD CONSTRAINT IF NOT EXISTS "CoverLetter_jobId_fkey" 
  FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "CoverLetter_userId_idx" ON "CoverLetter" ("userId");
CREATE INDEX IF NOT EXISTS "CoverLetter_resumeId_idx" ON "CoverLetter" ("resumeId");

-- ============================================
-- AtsAnalysis Table - Proper Foreign Keys
-- ============================================
ALTER TABLE "AtsAnalysis" 
  ADD CONSTRAINT IF NOT EXISTS "AtsAnalysis_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "AtsAnalysis" 
  ADD CONSTRAINT IF NOT EXISTS "AtsAnalysis_resumeId_fkey" 
  FOREIGN KEY ("resumeId") REFERENCES "Resume"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "AtsAnalysis_userId_idx" ON "AtsAnalysis" ("userId");
CREATE INDEX IF NOT EXISTS "AtsAnalysis_resumeId_idx" ON "AtsAnalysis" ("resumeId");

-- ============================================
-- ExportHistory Table - Track All Exports
-- ============================================
CREATE TABLE IF NOT EXISTS "ExportHistory" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "resumeId" INTEGER REFERENCES "Resume"(id) ON DELETE CASCADE,
  "tailoredResumeId" INTEGER REFERENCES "TailoredResume"(id) ON DELETE CASCADE,
  "coverLetterId" INTEGER REFERENCES "CoverLetter"(id) ON DELETE CASCADE,
  format TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ExportHistory_userId_idx" ON "ExportHistory" ("userId");
CREATE INDEX IF NOT EXISTS "ExportHistory_createdAt_idx" ON "ExportHistory" ("createdAt");

-- ============================================
-- UPSERT: Prevent Duplicate Jobs
-- ============================================
-- Note: This requires a unique constraint on (title, company) for jobs
-- If you want to prevent duplicates, uncomment the following:
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Job_title_company_unique" ON "Job" (title, company);

-- ============================================
-- UPSERT: Prevent Duplicate Applications
-- ============================================
-- Create unique constraint for saved applications per user
CREATE UNIQUE INDEX IF NOT EXISTS "Application_userId_jobId_unique" 
  ON "Application" ("userId", "jobId") 
  WHERE status = 'saved';

-- ============================================
-- Add updatedAt triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_updated_at ON "User";
CREATE TRIGGER update_user_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resume_updated_at ON "Resume";
CREATE TRIGGER update_resume_updated_at
  BEFORE UPDATE ON "Resume"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cover_letter_updated_at ON "CoverLetter";
CREATE TRIGGER update_cover_letter_updated_at
  BEFORE UPDATE ON "CoverLetter"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();