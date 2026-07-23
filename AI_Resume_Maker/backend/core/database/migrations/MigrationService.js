/**
 * Database Migration Service
 * Centralizes all database schema operations
 */

import { getPool } from '../../services/postgres.js';
import { logger } from '../../logger/index.js';

class MigrationService {
  constructor() {
    this.migrations = new Map();
    this.initializeMigrations();
  }

  initializeMigrations() {
    // User table migration
    this.migrations.set('user_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "User" (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          "passwordHash" TEXT,
          name TEXT,
          role TEXT DEFAULT 'user',
          "firstName" TEXT,
          "lastName" TEXT,
          phone TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          country TEXT,
          zip TEXT,
          linkedin TEXT,
          github TEXT,
          portfolio TEXT,
          "currentCompany" TEXT,
          designation TEXT,
          experience JSONB,
          education JSONB,
          skills JSONB,
          certifications JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    // Job table migration
    this.migrations.set('job_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "Job" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER,
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          location TEXT,
          salary TEXT,
          experience TEXT,
          "employmentType" TEXT,
          "workMode" TEXT,
          description TEXT,
          responsibilities TEXT,
          qualifications TEXT,
          "requiredSkills" JSONB,
          "preferredSkills" JSONB,
          keywords JSONB,
          source TEXT DEFAULT 'manual',
          "jobUrl" TEXT,
          "companyLogo" TEXT,
          "postedDate" TEXT,
          "isRemote" BOOLEAN DEFAULT false,
          "matchScore" INTEGER,
          "atsScore" INTEGER,
          "missingSkills" JSONB,
          "matchingSkills" JSONB,
          analysis JSONB,
          "tailoredResumeId" INTEGER,
          "coverLetterId" INTEGER,
          skills JSONB,
          benefits JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create unique index for upsert
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobUrl_unique"
        ON "Job" ("userId", "jobUrl")
        WHERE "userId" IS NOT NULL AND "jobUrl" IS NOT NULL
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Job_title_company_location_key"
        ON "Job" (title, company, COALESCE(location, ''))
      `);
    });

    // Resume table migration
    this.migrations.set('resume_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "Resume" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          "fileUrl" TEXT,
          "originalText" TEXT,
          "parsedData" JSONB,
          skills JSONB,
          experience JSONB,
          education JSONB,
          projects JSONB,
          summary TEXT,
          "isActive" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });

    // Tailored Resume table migration
    this.migrations.set('tailored_resume_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "TailoredResume" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "resumeId" INTEGER NOT NULL,
          "jobId" INTEGER,
          title TEXT NOT NULL,
          "jobDescription" TEXT,
          tone TEXT DEFAULT 'professional',
          optimization TEXT DEFAULT 'balanced',
          content JSONB,
          "atsScore" INTEGER,
          "matchScore" INTEGER,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
          FOREIGN KEY ("resumeId") REFERENCES "Resume"(id) ON DELETE CASCADE
        )
      `);
    });

    // Cover Letter table migration
    this.migrations.set('cover_letter_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "CoverLetter" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "resumeId" INTEGER,
          "jobId" INTEGER,
          title TEXT,
          content TEXT,
          company TEXT,
          position TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });

    // Application table migration
    this.migrations.set('application_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "Application" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "jobId" INTEGER NOT NULL,
          "resumeId" INTEGER,
          status TEXT DEFAULT 'applied',
          notes TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
          FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE
        )
      `);
    });

    // Saved Job table migration
    this.migrations.set('saved_job_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "SavedJob" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "jobId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
          FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE CASCADE,
          UNIQUE ("userId", "jobId")
        )
      `);
    });

    // Job Tracker table migration
    this.migrations.set('job_tracker_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "JobTracker" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "jobId" INTEGER,
          company TEXT NOT NULL,
          position TEXT NOT NULL,
          status TEXT DEFAULT 'wishlist',
          "appliedDate" TIMESTAMP,
          "lastActivity" TIMESTAMP,
          notes TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS "JobTrackerTimeline" (
          id SERIAL PRIMARY KEY,
          "trackerId" INTEGER NOT NULL,
          "fromStatus" TEXT,
          "toStatus" TEXT,
          notes TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("trackerId") REFERENCES "JobTracker"(id) ON DELETE CASCADE
        )
      `);
    });

    // User extended profile columns
    this.migrations.set('user_extended_columns', async (client) => {
      const columns = [
        { name: '"firstName"', type: 'TEXT' },
        { name: '"lastName"', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'city', type: 'TEXT' },
        { name: 'state', type: 'TEXT' },
        { name: 'country', type: 'TEXT' },
        { name: 'zip', type: 'TEXT' },
        { name: 'linkedin', type: 'TEXT' },
        { name: 'github', type: 'TEXT' },
        { name: 'portfolio', type: 'TEXT' },
        { name: '"currentCompany"', type: 'TEXT' },
        { name: 'designation', type: 'TEXT' },
        { name: 'experience', type: 'JSONB' },
        { name: 'education', type: 'JSONB' },
        { name: 'skills', type: 'JSONB' },
        { name: 'certifications', type: 'JSONB' },
      ];

      for (const col of columns) {
        try {
          await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        } catch (err) {
          // Column may already exist
        }
      }
    });

    // Master resume table (V2)
    this.migrations.set('master_resume_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "master_resume" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER UNIQUE NOT NULL,
          "parsedData" JSONB,
          "originalText" TEXT,
          name TEXT,
          email TEXT,
          phone TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });

    // Job analyses table
    this.migrations.set('job_analyses_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "job_analyses" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          title TEXT,
          company TEXT,
          location TEXT,
          salary TEXT,
          "employmentType" TEXT,
          "isRemote" BOOLEAN,
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
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });

    // Resume versions table
    this.migrations.set('resume_versions_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "resume_versions" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "masterResumeId" INTEGER,
          "jobId" INTEGER,
          "tailoredData" JSONB,
          "atsScore" INTEGER,
          "matchScore" INTEGER,
          "missingSkills" JSONB,
          "matchedSkills" JSONB,
          changes JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });

    // Saved jobs table (V2)
    this.migrations.set('saved_jobs_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "saved_jobs" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          title TEXT,
          company TEXT,
          location TEXT,
          salary TEXT,
          experience TEXT,
          "employmentType" TEXT,
          "isRemote" BOOLEAN,
          skills JSONB,
          description TEXT,
          url TEXT UNIQUE,
          source TEXT,
          "atsScore" INTEGER,
          "matchScore" INTEGER,
          status TEXT DEFAULT 'saved',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
          UNIQUE ("userId", url)
        )
      `);
    });

    // Cover letters table (V2)
    this.migrations.set('cover_letters_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "cover_letters" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          "masterResumeId" INTEGER,
          "jobId" INTEGER,
          title TEXT,
          company TEXT,
          position TEXT,
          content TEXT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });

    // Activity table
    this.migrations.set('activity_table', async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "activity" (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          action TEXT NOT NULL,
          details JSONB,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);
    });
  }

  async runMigrations() {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const migrationNames = Array.from(this.migrations.keys());
      logger.info('Running database migrations', { count: migrationNames.length });
      
      for (const [name, migrationFn] of this.migrations) {
        try {
          await migrationFn(client);
          logger.debug(`Migration completed: ${name}`);
        } catch (err) {
          logger.error(`Migration failed: ${name}`, { error: err.message });
          throw err;
        }
      }
      
      logger.info('All migrations completed successfully');
    } finally {
      client.release();
    }
  }

  async ensureTable(tableName) {
    const migrationName = `${tableName}_migration`;
    if (this.migrations.has(migrationName)) {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await this.migrations.get(migrationName)(client);
      } finally {
        client.release();
      }
    }
  }

  async ensureColumns(tableName, columns) {
    const pool = getPool();
    const client = await pool.connect();
    try {
      for (const col of columns) {
        try {
          await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        } catch (err) {
          // Column may already exist
        }
      }
    } finally {
      client.release();
    }
  }
}

// Singleton instance
export const migrationService = new MigrationService();
export default migrationService;
