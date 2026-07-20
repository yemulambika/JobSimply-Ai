import { getPool } from '../services/postgres.js';
import { ATSScoringEngine } from '../services/ats/ATSScoringEngine.js';
import { RecommendationEngine } from '../services/ats/RecommendationEngine.js';

// ATS Scoring Engine instance
const scoringEngine = new ATSScoringEngine();
const recommendationEngine = new RecommendationEngine();

// POST /ats/analyze - Analyze resume for ATS compatibility
export const analyzeResume = async (req, res, next) => {
  console.log('[ATS CONTROLLER] ===== ANALYZE RESUME START =====');
  try {
    const { resumeId, jobDescription } = req.body;
    const userId = req.user.id;

    if (!resumeId) {
      console.log('[ATS CONTROLLER] No resume ID provided');
      return res.status(400).json({ message: 'Resume ID is required' });
    }

    const client = await getPool().connect();
    try {
      // Get resume data
      const resumeResult = await client.query(
        'SELECT * FROM "Resume" WHERE id = $1 AND "userId" = $2',
        [resumeId, userId]
      );

      if (resumeResult.rows.length === 0) {
        console.log('[ATS CONTROLLER] Resume not found for ID:', resumeId);
        return res.status(404).json({ message: 'Resume not found' });
      }

      const resume = resumeResult.rows[0];
      const originalText = resume.originalText || '';
      const parsedData = resume.parsedData || {};

      console.log('[ATS CONTROLLER] Resume text length:', originalText.length);
      console.log('[ATS CONTROLLER] Resume parsed skills:', parsedData?.skills || resume.skills);

      // Run ATS analysis using the scoring engine
      const analysis = scoringEngine.analyze(originalText, { 
        description: jobDescription,
        title: '',
        company: ''
      });

      console.log('[ATS CONTROLLER] ATS Score:', analysis.atsScore);
      console.log('[ATS CONTROLLER] Skills Score:', analysis.scores.skills);
      console.log('[ATS CONTROLLER] Experience Score:', analysis.scores.experience);
      console.log('[ATS CONTROLLER] Matched Skills:', analysis.details.matchedSkills);
      console.log('[ATS CONTROLLER] Missing Skills:', analysis.details.missingSkills);

      // Generate recommendations
      const recommendations = recommendationEngine.generate(analysis.details, analysis.parsedResume, analysis.parsedJob);

      // Format the analysis result with detailed explanations
      const formattedAnalysis = {
        score: analysis.atsScore,
        keywordMatch: {
          matched: analysis.details.matchedSkills || [],
          missing: analysis.details.missingSkills || []
        },
        missingSkills: analysis.details.missingSkills || [],
        formattingIssues: [],
        suggestions: recommendations,
        sectionAnalysis: {
          skills: analysis.scores.skills,
          experience: analysis.scores.experience,
          projects: analysis.scores.projects,
          education: analysis.scores.education,
          responsibilities: analysis.scores.responsibilities,
          keywords: analysis.scores.keywords
        },
        readabilityScore: 85, // Default - could be enhanced with readability analysis
        recruiterReadiness: this.assessRecruiterReadiness(analysis.atsScore),
        // Detailed breakdown
        scores: analysis.scores,
        matchedSkills: analysis.details.matchedSkills || [],
        totalExperienceYears: analysis.details.totalYears || 0,
      };

      // Save analysis to database
      const analysisResult = await client.query(
        `INSERT INTO "AtsAnalysis" ("userId", "resumeId", "jobDescription", "score", "keywordMatch", "missingSkills", "formattingIssues", "suggestions", "sectionAnalysis", "readabilityScore", "recruiterReadiness", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          userId,
          resumeId,
          jobDescription || null,
          formattedAnalysis.score,
          JSON.stringify(formattedAnalysis.keywordMatch || {}),
          JSON.stringify(formattedAnalysis.missingSkills || []),
          JSON.stringify(formattedAnalysis.formattingIssues || []),
          JSON.stringify(formattedAnalysis.suggestions || []),
          JSON.stringify(formattedAnalysis.sectionAnalysis || {}),
          formattedAnalysis.readabilityScore,
          formattedAnalysis.recruiterReadiness,
        ]
      );

      res.status(200).json({
        success: true,
        analysis: formattedAnalysis,
        parsedData: analysis.parsedResume,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in analyzeResume:', error);
    next(error);
  }
};

/**
 * Assess recruiter readiness based on score
 */
function assessRecruiterReadiness(score) {
  if (score >= 85) return 'Excellent - Ready for top companies';
  if (score >= 70) return 'Good - Minor improvements recommended';
  if (score >= 50) return 'Fair - Needs optimization';
  if (score >= 30) return 'Needs improvement - Add more relevant skills';
  return 'Poor - Significant revision needed';
}

// GET /ats/history - Get ATS analysis history
export const getAnalysisHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();
    
    try {
      const result = await client.query(
        `SELECT a.*, r.title as "resumeTitle"
         FROM "AtsAnalysis" a
         JOIN "Resume" r ON a."resumeId" = r.id
         WHERE a."userId" = $1
         ORDER BY a."createdAt" DESC
         LIMIT 50`,
        [userId]
      );

      res.status(200).json({
        success: true,
        analyses: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /ats/:id - Get specific ATS analysis
export const getAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT * FROM "AtsAnalysis" WHERE id = $1 AND "userId" = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Analysis not found' });
      }

      res.status(200).json({
        success: true,
        analysis: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// POST /ats/analyze-simple - Simple analysis without job description
export const analyzeResumeSimple = async (req, res, next) => {
  try {
    const { resumeId } = req.body;
    const userId = req.user.id;

    if (!resumeId) {
      return res.status(400).json({ message: 'Resume ID is required' });
    }

    const client = await getPool().connect();
    try {
      const resumeResult = await client.query(
        'SELECT * FROM "Resume" WHERE id = $1 AND "userId" = $2',
        [resumeId, userId]
      );

      if (resumeResult.rows.length === 0) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      const resume = resumeResult.rows[0];
      const originalText = resume.originalText || '';

      // Run ATS analysis without job description
      const analysis = scoringEngine.analyze(originalText, { description: '' });

      // Format the analysis result
      const formattedAnalysis = {
        score: analysis.atsScore,
        keywordMatch: {
          matched: analysis.details.matchedSkills || [],
          missing: analysis.details.missingSkills || []
        },
        missingSkills: analysis.details.missingSkills || [],
        formattingIssues: [],
        suggestions: ['Your resume is well-structured. Consider adding more specific technical skills.'],
        sectionAnalysis: {
          skills: analysis.scores.skills,
          experience: analysis.scores.experience,
          projects: analysis.scores.projects,
          education: analysis.scores.education
        },
        readabilityScore: 85,
        recruiterReadiness: assessRecruiterReadiness(analysis.atsScore),
        scores: analysis.scores,
        matchedSkills: analysis.details.matchedSkills || [],
        totalExperienceYears: analysis.details.totalYears || 0,
      };

      res.status(200).json({
        success: true,
        analysis: formattedAnalysis,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in analyzeResumeSimple:', error);
    next(error);
  }
};