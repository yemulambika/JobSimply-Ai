import { jobService } from '../core/services/job/JobService.js';

/**
 * Extract job from extension and analyze with ATS
 * Uses the JobService for business logic
 */
export const extractJobAndAnalyze = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const jobData = req.validated || req.body;
    
    const result = await jobService.extractAndAnalyzeJob(userId, jobData);
    
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};