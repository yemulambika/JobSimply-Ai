-- Create User table first (required for login/register)
CREATE TABLE IF NOT EXISTS "User" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "user_email_idx" ON "User" (email);

-- Insert default user for testing
INSERT INTO "User" (email, passwordHash, name, role)
VALUES ('ambikayemul2001@gmail.com', '$2a$10$rQ7H8p9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3', 'Ambika Yemul', 'user')
ON CONFLICT (email) DO NOTHING;

-- Resume table
CREATE TABLE IF NOT EXISTS "Resume" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
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
);

CREATE INDEX IF NOT EXISTS "resume_userId_idx" ON "Resume" ("userId");
CREATE INDEX IF NOT EXISTS "resume_createdAt_idx" ON "Resume" ("createdAt");

-- Job table
CREATE TABLE IF NOT EXISTS "Job" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES "User"(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  salary VARCHAR(255),
  experience VARCHAR(255),
  "employmentType" VARCHAR(255),
  "workMode" VARCHAR(255),
  description TEXT,
  responsibilities TEXT,
  qualifications TEXT,
  "requiredSkills" JSONB,
  "preferredSkills" JSONB,
  keywords JSONB,
  source VARCHAR(255) DEFAULT 'manual',
  "jobUrl" TEXT,
  "companyLogo" TEXT,
  "postedDate" VARCHAR(255),
  "matchScore" INTEGER,
  "atsScore" INTEGER,
  "missingSkills" JSONB,
  "matchingSkills" JSONB,
  analysis JSONB,
  "tailoredResumeId" INTEGER,
  "coverLetterId" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "job_userId_idx" ON "Job" ("userId");
CREATE INDEX IF NOT EXISTS "job_createdAt_idx" ON "Job" ("createdAt");

-- TailoredResume table
CREATE TABLE IF NOT EXISTS "TailoredResume" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
  "jobId" INTEGER REFERENCES "Job"(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB,
  "jobDescription" TEXT,
  tone VARCHAR(50) DEFAULT 'professional',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "tailored_resume_userId_idx" ON "TailoredResume" ("userId");
CREATE INDEX IF NOT EXISTS "tailored_resume_resumeId_idx" ON "TailoredResume" ("resumeId");

-- CoverLetter table
CREATE TABLE IF NOT EXISTS "CoverLetter" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
  "jobId" INTEGER REFERENCES "Job"(id) ON DELETE SET NULL,
  title VARCHAR(255),
  content TEXT,
  company VARCHAR(255),
  position VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "cover_letter_userId_idx" ON "CoverLetter" ("userId");

-- Application table
CREATE TABLE IF NOT EXISTS "Application" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "resumeId" INTEGER NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'applied',
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "application_userId_idx" ON "Application" ("userId");
CREATE INDEX IF NOT EXISTS "application_jobId_idx" ON "Application" ("jobId");

-- SavedJob table
CREATE TABLE IF NOT EXISTS "SavedJob" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "saved_job_userId_idx" ON "SavedJob" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "saved_job_userId_jobId_unique" ON "SavedJob" ("userId", "jobId");

SELECT 'Database tables created successfully!' as status;