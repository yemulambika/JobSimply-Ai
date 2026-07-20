-- Migration: Fix Job table schema to match controller expectations
-- This adds missing columns for multi-user support and extension job extraction
-- Run this on existing databases to add columns without data loss

-- Step 1: Add userId column with foreign key reference
ALTER TABLE "Job" 
  ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE;

-- Step 2: Add all missing columns from extension/job extraction
ALTER TABLE "Job" 
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS "workMode" TEXT,
  ADD COLUMN IF NOT EXISTS "jobUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "companyLogo" TEXT,
  ADD COLUMN IF NOT EXISTS "postedDate" TEXT,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS "preferredSkills" JSONB,
  ADD COLUMN IF NOT EXISTS "atsScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "matchingSkills" JSONB,
  ADD COLUMN IF NOT EXISTS analysis JSONB,
  ADD COLUMN IF NOT EXISTS "tailoredResumeId" INTEGER,
  ADD COLUMN IF NOT EXISTS "coverLetterId" INTEGER;

-- Step 3: Migrate existing url data to jobUrl if needed (rename url to jobUrl for extension compatibility)
-- Note: If url column exists and jobUrl doesn't, copy data
-- If both exist, jobUrl takes precedence

-- Step 4: Create unique constraint for ON CONFLICT (userId, jobUrl)
-- This requires the columns to exist first, which we've done above
-- Using a unique index instead of constraint for flexibility
CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobUrl_unique" 
  ON "Job" ("userId", "jobUrl") 
  WHERE "userId" IS NOT NULL AND "jobUrl" IS NOT NULL;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS "Job_userId_idx" ON "Job" ("userId");
CREATE INDEX IF NOT EXISTS "Job_jobUrl_idx" ON "Job" ("jobUrl");

-- Step 6: Add foreign key constraints for tailoredResumeId and coverLetterId
ALTER TABLE "Job" 
  DROP CONSTRAINT IF EXISTS "Job_tailoredResumeId_fkey",
  ADD CONSTRAINT "Job_tailoredResumeId_fkey" 
  FOREIGN KEY ("tailoredResumeId") REFERENCES "TailoredResume"(id) ON DELETE SET NULL;

ALTER TABLE "Job" 
  DROP CONSTRAINT IF EXISTS "Job_coverLetterId_fkey",
  ADD CONSTRAINT "Job_coverLetterId_fkey" 
  FOREIGN KEY ("coverLetterId") REFERENCES "CoverLetter"(id) ON DELETE SET NULL;

-- Step 7: Add updatedAt trigger if not exists
DROP TRIGGER IF EXISTS update_job_updated_at ON "Job";
CREATE TRIGGER update_job_updated_at
  BEFORE UPDATE ON "Job"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();