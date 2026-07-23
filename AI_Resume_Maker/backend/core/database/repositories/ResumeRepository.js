/**
 * Resume Repository
 * Handles all resume-related database operations
 */

import { BaseRepository } from './BaseRepository.js';
import { migrationService } from '../migrations/MigrationService.js';

export class ResumeRepository extends BaseRepository {
  constructor() {
    super('Resume');
  }

  async initialize() {
    await migrationService.ensureTable('resume_table');
  }

  async findByUserId(userId) {
    await this.initialize();
    return this.findAll(userId);
  }

  async findActiveByUserId(userId) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM "Resume" WHERE "userId" = $1 AND "isActive" = true LIMIT 1',
        [userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findLatestByUserId(userId) {
    await this.initialize();
    const client = await this.getClient();
    try {
      // First try to find active resume
      let result = await client.query(
        'SELECT * FROM "Resume" WHERE "userId" = $1 AND "isActive" = true ORDER BY "createdAt" DESC LIMIT 1',
        [userId]
      );
      
      // If no active, get most recent
      if (result.rows.length === 0) {
        result = await client.query(
          'SELECT * FROM "Resume" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
          [userId]
        );
      }
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async create(data) {
    await this.initialize();
    
    // Parse JSON fields
    const parsedData = {
      ...data,
      skills: data.skills ? JSON.stringify(data.skills) : null,
      experience: data.experience ? JSON.stringify(data.experience) : null,
      education: data.education ? JSON.stringify(data.education) : null,
      projects: data.projects ? JSON.stringify(data.projects) : null,
      parsedData: data.parsedData ? JSON.stringify(data.parsedData) : null,
    };
    
    return super.create(parsedData);
  }

  async setActive(id, userId) {
    const client = await this.getClient();
    try {
      // Deactivate all user's resumes
      await client.query(
        'UPDATE "Resume" SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE "userId" = $1',
        [userId]
      );
      
      // Activate the specified resume
      const result = await client.query(
        'UPDATE "Resume" SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 AND "userId" = $2 RETURNING *',
        [id, userId]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async saveVersion(resumeId, content, changeNote = 'Auto-saved') {
    const client = await this.getClient();
    try {
      // Get current version number
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM "ResumeVersion" WHERE "resumeId" = $1',
        [resumeId]
      );
      const nextVersion = versionResult.rows[0].next_version;
      
      // Insert new version
      const result = await client.query(
        `INSERT INTO "ResumeVersion" ("resumeId", version, content, "changeNote")
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [resumeId, nextVersion, JSON.stringify(content), changeNote]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getVersions(resumeId) {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM "ResumeVersion" WHERE "resumeId" = $1 ORDER BY version DESC',
        [resumeId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async restoreVersion(resumeId, userId, versionNumber) {
    const client = await this.getClient();
    try {
      // Get the version to restore
      const versionResult = await client.query(
        'SELECT * FROM "ResumeVersion" WHERE "resumeId" = $1 AND version = $2',
        [resumeId, versionNumber]
      );
      
      if (versionResult.rows.length === 0) {
        return null;
      }
      
      const version = versionResult.rows[0];
      
      // Update resume with version content
      const result = await client.query(
        `UPDATE "Resume" SET content = $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2 AND "userId" = $3
         RETURNING *`,
        [version.content, resumeId, userId]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}

export const resumeRepository = new ResumeRepository();
export default resumeRepository;
