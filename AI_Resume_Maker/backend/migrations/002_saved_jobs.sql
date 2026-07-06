-- Migration: Create saved_jobs table with UPSERT support

-- Drop existing Application table if needed and create saved_jobs
DROP TABLE IF EXISTS "saved_jobs";

CREATE TABLE "saved_jobs" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  company TEXT,
  title TEXT,
  location TEXT,
  description TEXT,
  url TEXT,
  salary TEXT,
  experience TEXT,
  skills JSONB,
  platform TEXT,
  status TEXT DEFAULT 'saved',
  "atsScore" INTEGER,
  "matchScore" INTEGER,
  "resumeId" INTEGER REFERENCES "Resume"(id) ON DELETE SET NULL,
  "coverLetterId" INTEGER REFERENCES "CoverLetter"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups and UPSERT
CREATE UNIQUE INDEX "saved_jobs_userId_url_unique" ON "saved_jobs" ("userId", url) WHERE url IS NOT NULL;
CREATE INDEX "saved_jobs_userId_idx" ON "saved_jobs" ("userId");
CREATE INDEX "saved_jobs_status_idx" ON "saved_jobs" (status);

-- Trigger for updatedAt
CREATE OR REPLACE FUNCTION update_saved_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_saved_jobs_updated_at ON "saved_jobs";
CREATE TRIGGER update_saved_jobs_updated_at
  BEFORE UPDATE ON "saved_jobs"
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_jobs_updated_at();