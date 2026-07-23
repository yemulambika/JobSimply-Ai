/**
 * Job Repository
 * Handles all job-related database operations
 */

import { BaseRepository } from './BaseRepository.js';
import { migrationService } from '../migrations/MigrationService.js';

export class JobRepository extends BaseRepository {
  constructor() {
    super('Job');
  }

  async initialize() {
    await migrationService.ensureTable('job_table');
  }

  async findByUserId(userId, options = {}) {
    await this.initialize();
    return this.findAll(userId, options);
  }

  async findByUrl(userId, url) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM "Job" WHERE "userId" = $1 AND "jobUrl" = $2 LIMIT 1',
        [userId, url]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async findByTitleAndCompany(title, company, location = null) {
    await this.initialize();
    const client = await this.getClient();
    try {
      let query = 'SELECT * FROM "Job" WHERE title = $1 AND company = $2';
      const params = [title, company];
      
      if (location) {
        query += ' AND location = $3';
        params.push(location);
      }
      
      query += ' LIMIT 1';
      
      const result = await client.query(query, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async createOrUpdate(userId, jobData) {
    await this.initialize();
    const client = await this.getClient();
    
    try {
      // Try to find existing job
      let existingJob = null;
      
      if (jobData.jobUrl) {
        existingJob = await this.findByUrl(userId, jobData.jobUrl);
      }
      
      if (!existingJob && jobData.title && jobData.company) {
        existingJob = await this.findByTitleAndCompany(
          jobData.title, 
          jobData.company, 
          jobData.location
        );
      }
      
      if (existingJob) {
        // Update existing job
        return await this.update(existingJob.id, {
          ...jobData,
          userId,
          keywords: jobData.keywords ? JSON.stringify(jobData.keywords) : null,
          requiredSkills: jobData.requiredSkills ? JSON.stringify(jobData.requiredSkills) : null,
          preferredSkills: jobData.preferredSkills ? JSON.stringify(jobData.preferredSkills) : null,
        }, userId);
      } else {
        // Create new job
        return await this.create({
          ...jobData,
          userId,
          keywords: jobData.keywords ? JSON.stringify(jobData.keywords) : null,
          requiredSkills: jobData.requiredSkills ? JSON.stringify(jobData.requiredSkills) : null,
          preferredSkills: jobData.preferredSkills ? JSON.stringify(jobData.preferredSkills) : null,
        });
      }
    } finally {
      client.release();
    }
  }

  async updateAnalysis(id, analysis) {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `UPDATE "Job" 
         SET "matchScore" = $1, "atsScore" = $2, 
             "missingSkills" = $3, "matchingSkills" = $4, 
             analysis = $5, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [
          analysis.matchScore,
          analysis.atsScore,
          JSON.stringify(analysis.missingSkills || []),
          JSON.stringify(analysis.matchingSkills || []),
          JSON.stringify(analysis),
          id
        ]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async search(query, filters = {}, pagination = { page: 1, limit: 20 }) {
    await this.initialize();
    const client = await this.getClient();
    try {
      const conditions = [];
      const params = [];
      
      if (query) {
        conditions.push(`(title ILIKE $${params.length + 1} OR company ILIKE $${params.length + 1})`);
        params.push(`%${query}%`);
      }
      
      if (filters.location) {
        conditions.push(`location ILIKE $${params.length + 1}`);
        params.push(`%${filters.location}%`);
      }
      
      if (filters.remote) {
        conditions.push('"isRemote" = true');
      }
      
      if (filters.source) {
        conditions.push(`source = $${params.length + 1}`);
        params.push(filters.source);
      }
      
      const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
      
      // Count total
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM "Job"${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total, 10);
      
      // Get paginated results
      const offset = (pagination.page - 1) * pagination.limit;
      params.push(pagination.limit, offset);
      
      const result = await client.query(
        `SELECT * FROM "Job"${whereClause} ORDER BY "createdAt" DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      
      return {
        jobs: result.rows,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      };
    } finally {
      client.release();
    }
  }
}

export const jobRepository = new JobRepository();
export default jobRepository;
