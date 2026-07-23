/**
 * Job Service
 * Business logic for job-related operations
 */

import { jobRepository } from '../../database/repositories/JobRepository.js';
import { resumeRepository } from '../../database/repositories/ResumeRepository.js';
import { logger } from '../../logger/index.js';
import { NotFoundError, ValidationError } from '../../errors/AppError.js';
import { ATSScoringEngine } from '../../../services/ats/ATSScoringEngine.js';

const scoringEngine = new ATSScoringEngine();

export class JobService {
  async extractAndAnalyzeJob(userId, jobData) {
    logger.info('Extracting and analyzing job', { userId, title: jobData.title, company: jobData.company });
    
    // Validate required fields
    if (!jobData.title || !jobData.company) {
      throw new ValidationError('Job title and company are required');
    }
    
    // Save job to database
    const job = await jobRepository.createOrUpdate(userId, jobData);
    
    // Get user's resume for analysis
    const resume = await resumeRepository.findLatestByUserId(userId);
    
    // Run ATS analysis if resume exists
    let analysis = null;
    if (resume) {
      analysis = scoringEngine.analyze(resume.originalText || '', {
        title: jobData.title,
        company: jobData.company,
        description: jobData.description,
        location: jobData.location,
        requiredSkills: jobData.requiredSkills,
        keywords: jobData.keywords,
      });
      
      // Update job with analysis results
      await jobRepository.updateAnalysis(job.id, analysis);
      
      logger.info('Job analysis completed', { 
        jobId: job.id, 
        atsScore: analysis.atsScore,
        matchScore: analysis.matchScore 
      });
    }
    
    return {
      success: true,
      jobId: job.id,
      job: {
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        description: jobData.description,
        source: jobData.source,
      },
      analysis: analysis ? {
        atsScore: analysis.atsScore,
        matchScore: analysis.matchScore,
        missingSkills: analysis.details.missingSkills,
        matchingSkills: analysis.details.matchedSkills,
      } : null,
    };
  }

  async getJobById(jobId, userId = null) {
    const job = await jobRepository.findById(jobId, userId);
    
    if (!job) {
      throw new NotFoundError('Job', jobId);
    }
    
    // Parse JSON fields
    return {
      ...job,
      keywords: this.parseJsonField(job.keywords),
      requiredSkills: this.parseJsonField(job.requiredSkills),
      preferredSkills: this.parseJsonField(job.preferredSkills),
      missingSkills: this.parseJsonField(job.missingSkills),
      matchingSkills: this.parseJsonField(job.matchingSkills),
      analysis: this.parseJsonField(job.analysis),
    };
  }

  async searchJobs(query, filters, pagination) {
    logger.info('Searching jobs', { query, filters });
    
    const result = await jobRepository.search(query, filters, pagination);
    
    return {
      success: true,
      jobs: result.jobs.map(job => ({
        ...job,
        keywords: this.parseJsonField(job.keywords),
        requiredSkills: this.parseJsonField(job.requiredSkills),
        matchingSkills: this.parseJsonField(job.matchingSkills),
      })),
      meta: {
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  async getUserJobs(userId) {
    logger.info('Getting user jobs', { userId });
    
    const jobs = await jobRepository.findByUserId(userId);
    
    return {
      success: true,
      jobs,
    };
  }

  parseJsonField(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}

export const jobService = new JobService();
export default jobService;
