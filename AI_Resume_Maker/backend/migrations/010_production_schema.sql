-- Production Schema Migration for JobSimply
-- Run this to create all required tables

-- ============================================
-- Master Resume (ONE per user, never overwritten)
-- ============================================
DROP TABLE IF EXISTS "master_resume" CASCADE;
CREATE TABLE "master_resume" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "originalText" TEXT NOT NULL,
  "parsedData" JSONB NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin TEXT,
  github TEXT,
  portfolio TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "master_resume_userId_unique" ON "master_resume" ("userId");
CREATE INDEX "master_resume_createdAt_idx" ON "master_resume" ("createdAt");

-- ============================================
-- Resume Versions (Tailored copies)
-- ============================================
DROP TABLE IF EXISTS "resume_versions" CASCADE;
CREATE TABLE "resume_versions" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "masterResumeId" INTEGER NOT NULL REFERENCES "master_resume"(id) ON DELETE CASCADE,
  "jobId" INTEGER REFERENCES "jobs"(id) ON DELETE SET NULL,
  "tailoredData" JSONB NOT NULL,
  "atsScore" INTEGER,
  "matchScore" INTEGER,
  "missingSkills" TEXT[],
  "matchedSkills" TEXT[],
  "changes" JSONB,
  status TEXT DEFAULT 'draft',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "resume_versions_userId_idx" ON "resume_versions" ("userId");
CREATE INDEX "resume_versions_jobId_idx" ON "resume_versions" ("jobId");
CREATE INDEX "resume_versions_status_idx" ON "resume_versions" (status);

-- ============================================
-- Job Analysis
-- ============================================
DROP TABLE IF EXISTS "job_analyses" CASCADE;
CREATE TABLE "job_analyses" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "jobId" INTEGER REFERENCES "jobs"(id) ON DELETE SET NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  salary TEXT,
  "employmentType" TEXT,
  "isRemote" BOOLEAN,
  "atsKeywords" TEXT[],
  "requiredSkills" TEXT[],
  "preferredSkills" TEXT[],
  "niceToHave" TEXT[],
  industry TEXT,
  responsibilities TEXT[],
  description TEXT,
  url TEXT,
  source TEXT,
  "matchScore" INTEGER,
  "atsScore" INTEGER,
  "experienceMatch" INTEGER,
  "educationMatch" INTEGER,
  "skillsMatch" INTEGER,
  "projectMatch" INTEGER,
  "missingSkills" TEXT[],
  "matchedSkills" TEXT[],
  "resumeWeaknesses" TEXT[],
  "resumeStrengths" TEXT[],
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "job_analyses_userId_idx" ON "job_analyses" ("userId");
CREATE INDEX "job_analyses_jobId_idx" ON "job_analyses" ("jobId");
CREATE INDEX "job_analyses_createdAt_idx" ON "job_analyses" ("createdAt");

-- ============================================
-- Saved Jobs (Loop)
-- ============================================
DROP TABLE IF EXISTS "saved_jobs" CASCADE;
CREATE TABLE "saved_jobs" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "jobId" INTEGER REFERENCES "jobs"(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  salary TEXT,
  experience TEXT,
  "employmentType" TEXT,
  "isRemote" BOOLEAN,
  skills TEXT[],
  description TEXT,
  url TEXT,
  source TEXT,
  "atsScore" INTEGER DEFAULT 0,
  "matchScore" INTEGER DEFAULT 0,
  status TEXT DEFAULT 'saved',
  "resumeVersionId" INTEGER REFERENCES "resume_versions"(id) ON DELETE SET NULL,
  "coverLetterId" INTEGER REFERENCES "cover_letters"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "saved_jobs_userId_url_unique" ON "saved_jobs" ("userId", url) WHERE url IS NOT NULL;
CREATE INDEX "saved_jobs_userId_idx" ON "saved_jobs" ("userId");
CREATE INDEX "saved_jobs_status_idx" ON "saved_jobs" (status);

-- ============================================
-- Cover Letters
-- ============================================
DROP TABLE IF EXISTS "cover_letters" CASCADE;
CREATE TABLE "cover_letters" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "jobId" INTEGER REFERENCES "jobs"(id) ON DELETE SET NULL,
  "masterResumeId" INTEGER REFERENCES "master_resume"(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT,
  position TEXT,
  content TEXT NOT NULL,
  "fileUrl" TEXT,
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "cover_letters_userId_idx" ON "cover_letters" ("userId");
CREATE INDEX "cover_letters_jobId_idx" ON "cover_letters" ("jobId");

-- ============================================
-- Job Matches (Comparison Data)
-- ============================================
DROP TABLE IF EXISTS "job_matches" CASCADE;
CREATE TABLE "job_matches" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "jobAnalysisId" INTEGER NOT NULL REFERENCES "job_analyses"(id) ON DELETE CASCADE,
  "masterResumeId" INTEGER NOT NULL REFERENCES "master_resume"(id) ON DELETE CASCADE,
  "matchingSkills" TEXT[],
  "missingSkills" TEXT[],
  "matchingExperience" JSONB,
  "missingExperience" JSONB,
  "matchingProjects" JSONB,
  "missingProjects" JSONB,
  "keywordDensity" JSONB,
  "atsScore" INTEGER,
  "overallScore" INTEGER,
  "experienceMatchPercent" INTEGER,
  "educationMatchPercent" INTEGER,
  "technicalMatchPercent" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "job_matches_userId_idx" ON "job_matches" ("userId");
CREATE INDEX "job_matches_jobAnalysisId_idx" ON "job_matches" ("jobAnalysisId");

-- ============================================
-- Activity Log
-- ============================================
DROP TABLE IF EXISTS "activity" CASCADE;
CREATE TABLE "activity" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "activity_userId_idx" ON "activity" ("userId");
CREATE INDEX "activity_createdAt_idx" ON "activity" ("createdAt");

-- ============================================
-- AI History
-- ============================================
DROP TABLE IF EXISTS "ai_history" CASCADE;
CREATE TABLE "ai_history" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- extraction, analysis, tailoring, cover_letter
  input JSONB,
  output JSONB,
  "processingTimeMs" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ai_history_userId_idx" ON "ai_history" ("userId");
CREATE INDEX "ai_history_stage_idx" ON "ai_history" (stage);

-- ============================================
-- Resume Templates
-- ============================================
DROP TABLE IF EXISTS "resume_templates" CASCADE;
CREATE TABLE "resume_templates" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  "htmlTemplate" TEXT NOT NULL,
  "cssTemplate" TEXT,
  "isDefault" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Resume Keywords (User's skill keywords)
-- ============================================
DROP TABLE IF EXISTS "resume_keywords" CASCADE;
CREATE TABLE "resume_keywords" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT, -- technical, soft, tool, language
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "resume_keywords_userId_keyword_unique" ON "resume_keywords" ("userId", keyword);
CREATE INDEX "resume_keywords_userId_idx" ON "resume_keywords" ("userId");

-- ============================================
-- Job Keywords (Extracted keywords per job)
-- ============================================
DROP TABLE IF EXISTS "job_keywords" CASCADE;
CREATE TABLE "job_keywords" (
  id SERIAL PRIMARY KEY,
  "jobAnalysisId" INTEGER NOT NULL REFERENCES "job_analyses"(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT, -- required, preferred, nice_to_have
  weight INTEGER DEFAULT 1,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "job_keywords_jobAnalysisId_idx" ON "job_keywords" ("jobAnalysisId");

-- ============================================
-- Application History
-- ============================================
DROP TABLE IF EXISTS "application_history" CASCADE;
CREATE TABLE "application_history" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "savedJobId" INTEGER REFERENCES "saved_jobs"(id) ON DELETE SET NULL,
  "resumeVersionId" INTEGER REFERENCES "resume_versions"(id) ON DELETE SET NULL,
  "coverLetterId" INTEGER REFERENCES "cover_letters"(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'applied', -- applied, interview, offer, rejected, wishlist
  notes TEXT,
  "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "application_history_userId_idx" ON "application_history" ("userId");
CREATE INDEX "application_history_status_idx" ON "application_history" (status);

-- ============================================
-- updatedAt triggers for all tables
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_master_resume_updated_at ON "master_resume";
CREATE TRIGGER update_master_resume_updated_at
  BEFORE UPDATE ON "master_resume" FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resume_versions_updated_at ON "resume_versions";
CREATE TRIGGER update_resume_versions_updated_at
  BEFORE UPDATE ON "resume_versions" FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cover_letters_updated_at ON "cover_letters";
CREATE TRIGGER update_cover_letters_updated_at
  BEFORE UPDATE ON "cover_letters" FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_jobs_updated_at ON "saved_jobs";
CREATE TRIGGER update_saved_jobs_updated_at
  BEFORE UPDATE ON "saved_jobs" FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_application_history_updated_at ON "application_history";
CREATE TRIGGER update_application_history_updated_at
  BEFORE UPDATE ON "application_history" FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();