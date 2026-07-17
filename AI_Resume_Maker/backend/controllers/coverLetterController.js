import { getPool } from '../services/postgres.js';
import { geminiText, isGeminiConfigured } from '../services/ai/geminiClient.js';

// POST /coverletters - Generate cover letter
export const generateCoverLetter = async (req, res, next) => {
  try {
    const { resumeId, jobId, company, position, hiringManager, tone = 'professional' } = req.body;
    const userId = req.user.id;

    const client = await getPool().connect();
    try {
      // Get resume data
      let resumeQuery = 'SELECT * FROM "Resume" WHERE "userId" = $1';
      let resumeParams = [userId];
      
      if (resumeId) {
        resumeQuery = 'SELECT * FROM "Resume" WHERE id = $1 AND "userId" = $2';
        resumeParams = [resumeId, userId];
      } else {
        resumeQuery += ' AND "isActive" = true';
      }
      
      const resumeResult = await client.query(resumeQuery, resumeParams);
      
      if (resumeResult.rows.length === 0) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      const resume = resumeResult.rows[0];
      let job = null;

      // Get job data if jobId provided
      if (jobId) {
        const jobResult = await client.query('SELECT * FROM "Job" WHERE id = $1', [jobId]);
        job = jobResult.rows[0] || null;
      }

      // Generate cover letter using AI
      const coverLetter = await generateCoverLetterContent(resume, job, company, position, hiringManager, tone);

      // Save cover letter
      const coverLetterResult = await client.query(
        `INSERT INTO "CoverLetter" ("userId", "resumeId", "jobId", title, content, company, position, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          userId,
          resume.id,
          jobId || null,
          `Cover Letter for ${job?.company || company || 'Position'}`,
          coverLetter,
          company || job?.company || null,
          position || job?.title || null,
        ]
      );

      res.status(200).json({
        success: true,
        coverLetter: coverLetterResult.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in generateCoverLetter:', error);
    next(error);
  }
};

// GET /coverletters - List all cover letters
export const listCoverLetters = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();
    
    try {
      const result = await client.query(
        `SELECT c.*, j.company as "jobCompany", j.title as "jobTitle"
         FROM "CoverLetter" c
         LEFT JOIN "Job" j ON c."jobId" = j.id
         WHERE c."userId" = $1
         ORDER BY c."createdAt" DESC`,
        [userId]
      );

      res.status(200).json({
        success: true,
        coverLetters: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /coverletters/:id - Get specific cover letter
export const getCoverLetter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT * FROM "CoverLetter" WHERE id = $1 AND "userId" = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Cover letter not found' });
      }

      res.status(200).json({
        success: true,
        coverLetter: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to generate cover letter content
async function generateCoverLetterContent(resume, job, company, position, hiringManager, tone) {
  const prompt = `Write a compelling cover letter for this job application.

Resume:
${JSON.stringify(resume.parsedData || {}, null, 2)}

${job ? `Job Details:\nCompany: ${job.company}\nTitle: ${job.title}\nDescription: ${job.description}\n` : ''}
${!job && company ? `Company: ${company}\nPosition: ${position}\n` : ''}
${hiringManager ? `Hiring Manager: ${hiringManager}\n` : ''}

Tone: ${tone}

Write a professional cover letter (3-4 paragraphs) that:
1. Opens with enthusiasm for the role
2. Highlights 2-3 key qualifications matching the job
3. Shows knowledge of the company/position
4. Closes with a call to action

Return as plain text (not JSON).`;

  try {
    if (isGeminiConfigured()) {
      const text = await geminiText(prompt);
      return text || 'Cover letter could not be generated.';
    } else if (process.env.GROQ_API_KEY) {
      const Groq = (await import('groq-sdk')).default;
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
      });
      return completion.choices[0]?.message?.content || 'Cover letter could not be generated.';
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
      return data.choices[0]?.message?.content || 'Cover letter could not be generated.';
    }
  } catch (error) {
    console.error('AI cover letter error:', error);
  }

  // Fallback template
  return `Dear ${hiringManager || 'Hiring Manager'},\n\nI am writing to express my interest in the ${position || 'position'} at ${company || 'your company'}. Based on my review of your requirements, I believe my skills and experience align well with what you are seeking.\n\n${resume.parsedData?.summary || 'My background includes relevant experience that would contribute to your team\'s success.'}\n\nI would welcome the opportunity to discuss how I can contribute to your organization. Thank you for your consideration.\n\nSincerely,\n${resume.parsedData?.name || 'Candidate'}`;
}
