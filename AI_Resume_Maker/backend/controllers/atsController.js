import { getPool } from '../services/postgres.js';

// POST /ats/analyze - Analyze resume for ATS compatibility
export const analyzeResume = async (req, res, next) => {
  try {
    const { resumeId, jobDescription } = req.body;
    const userId = req.user.id;

    if (!resumeId) {
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
        return res.status(404).json({ message: 'Resume not found' });
      }

      const resume = resumeResult.rows[0];
      const originalText = resume.originalText || '';
      const parsedData = resume.parsedData || {};

      // ATS Analysis using AI
      const prompt = `Analyze this resume for ATS (Applicant Tracking System) compatibility.
      
Resume Text:
${originalText.substring(0, 5000)}

${jobDescription ? `Job Description:\n${jobDescription.substring(0, 2000)}` : ''}

Return a JSON object with:
- score (0-100): Overall ATS compatibility score
- keywordMatch (object): { matched: [], missing: [] } based on job description if provided
- missingSkills (array): Skills from job description that are missing
- formattingIssues (array): List of formatting problems
- suggestions (array): Actionable suggestions to improve ATS score
- sectionAnalysis (object): Analysis of each resume section
- readabilityScore (0-100): How readable the resume is
- recruiterReadiness (string): Assessment of how ready this resume is for recruiters

Format response as valid JSON only.`;

      const analysis = await getATSAnalysis(prompt);

      // Save analysis to database
      const analysisResult = await client.query(
        `INSERT INTO "AtsAnalysis" ("userId", "resumeId", "jobDescription", "score", "keywordMatch", "missingSkills", "formattingIssues", "suggestions", "sectionAnalysis", "readabilityScore", "recruiterReadiness", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          userId,
          resumeId,
          jobDescription || null,
          analysis.score,
          JSON.stringify(analysis.keywordMatch || {}),
          JSON.stringify(analysis.missingSkills || []),
          JSON.stringify(analysis.formattingIssues || []),
          JSON.stringify(analysis.suggestions || []),
          JSON.stringify(analysis.sectionAnalysis || {}),
          analysis.readabilityScore,
          analysis.recruiterReadiness,
        ]
      );

      res.status(200).json({
        success: true,
        analysis: analysisResult.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in analyzeResume:', error);
    next(error);
  }
};

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

// Helper function to get ATS analysis from AI
async function getATSAnalysis(prompt) {
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  
  if (process.env.GROQ_API_KEY) {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
    });
    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } else if (process.env.OPENROUTER_API_KEY) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    return JSON.parse(data.choices[0]?.message?.content || '{}');
  }
  
  // Fallback basic analysis
  return {
    score: 75,
    keywordMatch: { matched: [], missing: [] },
    missingSkills: [],
    formattingIssues: [],
    suggestions: ['Add more relevant keywords from the job description'],
    sectionAnalysis: {},
    readabilityScore: 80,
    recruiterReadiness: 'Good foundation, but could be optimized further',
  };
}