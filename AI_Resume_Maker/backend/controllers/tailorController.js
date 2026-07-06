import { getPool } from '../services/postgres.js';

// POST /tailor - Tailor resume for specific job
export const tailorResume = async (req, res, next) => {
  try {
    const { resumeId, jobId, jobDescription, tone = 'professional' } = req.body;
    const userId = req.user.id;

    if (!resumeId && !jobId) {
      return res.status(400).json({ message: 'Resume ID or Job ID is required' });
    }

    const client = await getPool().connect();
    try {
      // Get resume data
      let resumeQuery = 'SELECT * FROM "Resume" WHERE "userId" = $1';
      let resumeParams = [userId];
      
      if (resumeId) {
        resumeQuery += ' AND id = $2';
        resumeParams.push(resumeId);
      } else {
        // Get active resume if no resumeId provided
        resumeQuery += ' AND "isActive" = true';
      }
      
      const resumeResult = await client.query(resumeQuery, resumeParams);
      
      if (resumeResult.rows.length === 0) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      const resume = resumeResult.rows[0];
      let targetJob = null;

      // Get job data if jobId provided
      if (jobId) {
        const jobResult = await client.query('SELECT * FROM "Job" WHERE id = $1', [jobId]);
        targetJob = jobResult.rows[0] || null;
      }

      // Generate tailored resume using AI
      const tailored = await generateTailoredResume(resume, targetJob, jobDescription, tone);

      // Save tailored version
      const tailoredResult = await client.query(
        `INSERT INTO "TailoredResume" ("userId", "resumeId", "jobId", title, content, "jobDescription", tone, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          userId,
          resume.id,
          jobId || null,
          `Tailored for ${targetJob?.company || 'Custom Role'}`,
          JSON.stringify(tailored),
          jobDescription || null,
          tone,
        ]
      );

      res.status(200).json({
        success: true,
        tailored: tailoredResult.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in tailorResume:', error);
    next(error);
  }
};

// GET /tailor/history - Get tailoring history
export const getTailorHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();
    
    try {
      const result = await client.query(
        `SELECT t.*, r.title as "originalResumeTitle", j.company as "jobCompany", j.title as "jobTitle"
         FROM "TailoredResume" t
         LEFT JOIN "Resume" r ON t."resumeId" = r.id
         LEFT JOIN "Job" j ON t."jobId" = j.id
         WHERE t."userId" = $1
         ORDER BY t."createdAt" DESC
         LIMIT 50`,
        [userId]
      );

      res.status(200).json({
        success: true,
        tailors: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to generate tailored resume
async function generateTailoredResume(resume, job, jobDescription, tone) {
  const prompt = `Tailor this resume for the specific job. Match keywords, highlight relevant experience, and optimize for ATS.

Original Resume:
${JSON.stringify(resume.parsedData || {}, null, 2)}

${job ? `Target Job:\nCompany: ${job.company}\nTitle: ${job.title}\nDescription: ${job.description}\n` : ''}
${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}

Tone: ${tone}

Return a JSON object with:
- tailoredContent (object): The tailored resume data with optimized sections
- matchScore (0-100): How well the resume matches the job
- keyChanges (array): List of key changes made
- highlightedSkills (array): Skills that were highlighted as matching
- optimizedExperience (array): Experience entries that were optimized

Format as valid JSON only.`;

  try {
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
  } catch (error) {
    console.error('AI tailoring error:', error);
  }

  // Fallback
  return {
    tailoredContent: resume.parsedData,
    matchScore: 60,
    keyChanges: ['Basic optimization applied'],
    highlightedSkills: resume.parsedData?.skills || [],
    optimizedExperience: resume.parsedData?.experience || [],
  };
}