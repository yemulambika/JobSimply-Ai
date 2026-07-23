import { jobService } from '../core/services/job/JobService.js';
import { aggregateJobs } from '../services/jobs/JobAggregator.js';
import { getUserSavedJobs } from '../services/jobs/JobStorage.js';
import { buildPagination } from '../core/responses/index.js';

// GET /jobs/aggregate?query=...&location=...&remoteOnly=true|false
export const aggregateAndStoreJobs = async (req, res, next) => {
  try {
    const { query, location, remoteOnly } = req.query;
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Query parameter is required' }
      });
    }
    const jobs = await aggregateJobs(query, location || '', remoteOnly === 'true');
    res.status(200).json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};

// GET /jobs - List all jobs
export const listStoredJobs = async (req, res, next) => {
  try {
    const { query, location, remote, page, limit } = req.query;
    const filters = {};
    if (query) filters.query = query;
    if (location) filters.location = location;
    if (remote) filters.remote = true;
    
    const pagination = buildPagination({ page, limit });
    const result = await jobService.searchJobs(query, filters, pagination);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// GET /jobs/:id - Get job by ID (for TailoredJobPage)
export const getJobByIdHandler = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    
    if (isNaN(jobId)) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Invalid job ID' }
      });
    }
    
    const job = await jobService.getJobById(jobId, userId);
    res.status(200).json(job);
  } catch (error) {
    next(error);
  }
};

// GET /jobs/saved - List jobs saved by user (from extension)
export const listUserSavedJobs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication required' }
      });
    }
    
    const jobs = await getUserSavedJobs(userId);
    res.status(200).json({ success: true, jobs });
  } catch (error) {
    next(error);
  }
};