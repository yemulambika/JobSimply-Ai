-- Migration: Task Queue for Background Processing

-- Task queue table
CREATE TABLE IF NOT EXISTS "TaskQueue" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- analyze, tailor, coverLetter, autoApply
  status TEXT NOT NULL DEFAULT 'queued', -- queued, extracting, analyzing, tailoring, generating, uploading, autofilling, completed, failed
  priority INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  "etaSeconds" INTEGER,
  "currentStep" TEXT,
  "jobId" INTEGER REFERENCES "Job"(id) ON DELETE SET NULL,
  "resumeId" INTEGER REFERENCES "Resume"(id) ON DELETE SET NULL,
  "tailoredResumeId" INTEGER REFERENCES "TailoredResume"(id) ON DELETE SET NULL,
  "coverLetterId" INTEGER REFERENCES "CoverLetter"(id) ON DELETE SET NULL,
  result JSONB,
  error TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "TaskQueue_userId_idx" ON "TaskQueue" ("userId");
CREATE INDEX IF NOT EXISTS "TaskQueue_status_idx" ON "TaskQueue" (status);
CREATE INDEX IF NOT EXISTS "TaskQueue_createdAt_idx" ON "TaskQueue" ("createdAt");

-- updatedAt trigger
DROP TRIGGER IF EXISTS update_task_queue_updated_at ON "TaskQueue";
CREATE TRIGGER update_task_queue_updated_at
  BEFORE UPDATE ON "TaskQueue"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Task steps table for detailed tracking
CREATE TABLE IF NOT EXISTS "TaskSteps" (
  id SERIAL PRIMARY KEY,
  "taskId" INTEGER REFERENCES "TaskQueue"(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  startedAt TIMESTAMP,
  completedAt TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TaskSteps_taskId_idx" ON "TaskSteps" ("taskId");