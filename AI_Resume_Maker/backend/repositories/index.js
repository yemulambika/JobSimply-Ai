// Backend Repository Pattern - All database operations

import { getPool } from './postgres.js';

// Master Resume Repository
export class MasterResumeRepository {
  async getOrCreate(userId, parsedData, originalText) {
    const client = await getPool().connect();
    try {
      let result = await client.query(
        'SELECT * FROM "master_resume" WHERE "userId" = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        result = await client.query(
          `INSERT INTO "master_resume" ("userId", "parsedData", "originalText", name, email, phone)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [userId, JSON.stringify(parsedData), originalText, parsedData.name, parsedData.email, parsedData.phone]
        );
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getByUserId(userId) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'SELECT * FROM "master_resume" WHERE "userId" = $1',
        [userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async update(userId, data) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `UPDATE "master_resume" 
         SET "parsedData" = $1, "originalText" = $2, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $3
         RETURNING *`,
        [JSON.stringify(data.parsedData), data.originalText, userId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Job Analyses Repository
export class JobAnalysesRepository {
  async create(userId, jobData, analysisResults) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO "job_analyses" 
         ("userId", title, company, location, salary, "employmentType", "isRemote",
          "atsKeywords", "requiredSkills", "preferredSkills", "niceToHave", industry, 
          responsibilities, description, url, source, "matchScore", "atsScore",
          "experienceMatch", "educationMatch", "skillsMatch", "projectMatch",
          "missingSkills", "matchedSkills", "resumeWeaknesses", "resumeStrengths")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
         RETURNING *`,
        [
          userId, jobData.title, jobData.company, jobData.location, jobData.salary,
          jobData.employmentType, jobData.isRemote, analysisResults.atsKeywords,
          analysisResults.requiredSkills, analysisResults.preferredSkills, analysisResults.niceToHave,
          jobData.industry, jobData.responsibilities, jobData.description, jobData.url, jobData.source,
          analysisResults.matchScore, analysisResults.atsScore, analysisResults.experienceMatch,
          analysisResults.educationMatch, analysisResults.skillsMatch, analysisResults.projectMatch,
          analysisResults.missingSkills, analysisResults.matchedSkills, analysisResults.weaknesses, analysisResults.strengths
        ]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Resume Versions Repository
export class ResumeVersionsRepository {
  async create(userId, masterResumeId, jobId, tailoredData, scores, changes) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO "resume_versions" 
         ("userId", "masterResumeId", "jobId", "tailoredData", "atsScore", "matchScore", "missingSkills", "matchedSkills", "changes")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userId, masterResumeId, jobId, JSON.stringify(tailoredData), scores.atsScore, scores.matchScore,
          scores.missingSkills, scores.matchedSkills, JSON.stringify(changes)
        ]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Saved Jobs Repository
export class SavedJobsRepository {
  async createOrUpdate(userId, jobData, analysisResults) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO "saved_jobs" 
         ("userId", title, company, location, salary, experience, "employmentType", "isRemote",
          skills, description, url, source, "atsScore", "matchScore", status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT ("userId", url) DO UPDATE 
         SET status = EXCLUDED.status, "atsScore" = EXCLUDED."atsScore", "matchScore" = EXCLUDED."matchScore"
         RETURNING *`,
        [
          userId, jobData.title, jobData.company, jobData.location, jobData.salary, jobData.experience,
          jobData.employmentType, jobData.isRemote, jobData.skills, jobData.description, jobData.url,
          jobData.source, analysisResults.atsScore, analysisResults.matchScore, 'saved'
        ]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getByUserId(userId) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'SELECT * FROM "saved_jobs" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}

// Cover Letter Repository
export class CoverLetterRepository {
  async create(userId, masterResumeId, jobId, title, company, position, content) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO "cover_letters" 
         ("userId", "masterResumeId", "jobId", title, company, position, content)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, masterResumeId, jobId, title, company, position, content]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// Activity Repository
export class ActivityRepository {
  async create(userId, action, details = null) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'INSERT INTO "activity" ("userId", action, details) VALUES ($1, $2, $3) RETURNING *',
        [userId, action, details ? JSON.stringify(details) : null]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getByUserId(userId, limit = 20) {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'SELECT * FROM "activity" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}