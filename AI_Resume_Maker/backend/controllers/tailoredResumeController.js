import { getPool } from '../services/postgres.js';

// Get tailored resumes for a specific job
export const getTailoredResumes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.query;
    
    let result;
    if (jobId) {
      // Get tailored resumes for specific job
      result = await getPool().query(
        `SELECT tr.*, j.company, j.title as jobTitle
         FROM "TailoredResume" tr
         LEFT JOIN "Job" j ON tr."jobId" = j.id
         WHERE tr."userId" = $1 AND tr."jobId" = $2
         ORDER BY tr."createdAt" DESC`,
        [userId, jobId]
      );
    } else {
      // Get all tailored resumes
      result = await getPool().query(
        `SELECT tr.*, j.company, j.title as jobTitle
         FROM "TailoredResume" tr
         LEFT JOIN "Job" j ON tr."jobId" = j.id
         WHERE tr."userId" = $1
         ORDER BY tr."createdAt" DESC`,
        [userId]
      );
    }
    
    res.status(200).json({ 
      success: true, 
      tailoredResumes: result.rows 
    });
  } catch (error) {
    console.error('[BACKEND] getTailoredResumes - Error:', error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};

// Get a specific tailored resume by ID
export const getTailoredResumeById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const result = await getPool().query(
      `SELECT tr.*, j.company, j.title as jobTitle
       FROM "TailoredResume" tr
       LEFT JOIN "Job" j ON tr."jobId" = j.id
       WHERE tr.id = $1 AND tr."userId" = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tailored resume not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      tailoredResume: result.rows[0] 
    });
  } catch (error) {
    console.error('[BACKEND] getTailoredResumeById - Error:', error.message);
    res.status(500).json({ message: 'Internal server error: ' + error.message });
  }
};