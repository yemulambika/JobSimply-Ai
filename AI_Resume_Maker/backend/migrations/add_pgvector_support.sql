-- Migration: Add pgvector support for semantic search
-- This script enables the pgvector extension and adds vector columns to existing tables

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to Resume table
ALTER TABLE "Resume" 
ADD COLUMN IF NOT EXISTS "skillsEmbedding" vector(384),
ADD COLUMN IF NOT EXISTS "experienceEmbedding" vector(384),
ADD COLUMN IF NOT EXISTS "educationEmbedding" vector(384),
ADD COLUMN IF NOT EXISTS "projectsEmbedding" vector(384),
ADD COLUMN IF NOT EXISTS "summaryEmbedding" vector(384);

-- Add vector columns to Job table
ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "skillsEmbedding" vector(384),
ADD COLUMN IF NOT EXISTS "descriptionEmbedding" vector(384),
ADD COLUMN IF NOT EXISTS "responsibilitiesEmbedding" vector(384);

-- Create indexes for efficient vector similarity search
CREATE INDEX IF NOT EXISTS "resume_skills_embedding_idx" ON "Resume" USING ivfflat ("skillsEmbedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "resume_experience_embedding_idx" ON "Resume" USING ivfflat ("experienceEmbedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "resume_education_embedding_idx" ON "Resume" USING ivfflat ("educationEmbedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "resume_projects_embedding_idx" ON "Resume" USING ivfflat ("projectsEmbedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "resume_summary_embedding_idx" ON "Resume" USING ivfflat ("summaryEmbedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS "job_skills_embedding_idx" ON "Job" USING ivfflat ("skillsEmbedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "job_description_embedding_idx" ON "Job" USING ivfflat ("descriptionEmbedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "job_responsibilities_embedding_idx" ON "Job" USING ivfflat ("responsibilitiesEmbedding" vector_cosine_ops);

-- Add comment to document the purpose
COMMENT ON COLUMN "Resume"."skillsEmbedding" IS 'Semantic embedding for skills section (384-dim vector from sentence-transformers)';
COMMENT ON COLUMN "Resume"."experienceEmbedding" IS 'Semantic embedding for experience section';
COMMENT ON COLUMN "Resume"."educationEmbedding" IS 'Semantic embedding for education section';
COMMENT ON COLUMN "Resume"."projectsEmbedding" IS 'Semantic embedding for projects section';
COMMENT ON COLUMN "Resume"."summaryEmbedding" IS 'Semantic embedding for summary section';

COMMENT ON COLUMN "Job"."skillsEmbedding" IS 'Semantic embedding for job skills';
COMMENT ON COLUMN "Job"."descriptionEmbedding" IS 'Semantic embedding for job description';
COMMENT ON COLUMN "Job"."responsibilitiesEmbedding" IS 'Semantic embedding for job responsibilities';
