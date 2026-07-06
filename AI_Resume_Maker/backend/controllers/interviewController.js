import { getPool } from '../services/postgres.js';

// POST /interviews - Create interview prep
export const createInterviewPrep = async (req, res, next) => {
  try {
    const { company, role, resumeId } = req.body;
    const userId = req.user.id;

    if (!company || !role) {
      return res.status(400).json({ message: 'Company and role are required' });
    }

    const client = await getPool().connect();
    try {
      // Get resume if provided
      let resume = null;
      if (resumeId) {
        const resumeResult = await client.query(
          'SELECT * FROM "Resume" WHERE id = $1 AND "userId" = $2',
          [resumeId, userId]
        );
        resume = resumeResult.rows[0] || null;
      }

      // Generate interview questions using AI
      const prepData = await generateInterviewPrep(resume, company, role);

      const result = await client.query(
        `INSERT INTO "InterviewPrep" ("userId", company, role, questions, tips, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [userId, company, role, JSON.stringify(prepData.questions), prepData.tips]
      );

      res.status(201).json({
        success: true,
        interviewPrep: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in createInterviewPrep:', error);
    next(error);
  }
};

// GET /interviews - List all interview prep sessions
export const listInterviewPreps = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        `SELECT * FROM "InterviewPrep" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
        [userId]
      );

      res.status(200).json({
        success: true,
        interviewPreps: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /interviews/:id - Get specific interview prep
export const getInterviewPrep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT * FROM "InterviewPrep" WHERE id = $1 AND "userId" = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Interview prep not found' });
      }

      res.status(200).json({
        success: true,
        interviewPrep: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /interviews/:id - Delete interview prep
export const deleteInterviewPrep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'DELETE FROM "InterviewPrep" WHERE id = $1 AND "userId" = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Interview prep not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Interview prep deleted',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to generate interview preparation
async function generateInterviewPrep(resume, company, role) {
  const prompt = `Generate interview preparation materials for this job.

Resume:
${resume ? JSON.stringify(resume.parsedData || {}, null, 2) : 'No resume provided'}

Company: ${company}
Role: ${role}

Return a JSON object with:
- questions (array): 10-15 potential interview questions (technical and behavioral)
- tips (string): General interview tips and company-specific advice

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
    console.error('AI interview prep error:', error);
  }

  // Fallback questions
  return {
    questions: [
      'Tell me about yourself',
      'Why do you want to work at ' + company + '?',
      'What are your strengths?',
      'What are your weaknesses?',
      'Describe a challenge you overcame',
      'Where do you see yourself in 5 years?',
      'Why should we hire you?',
      'What do you know about our company?',
      'Describe your ideal work environment',
      'How do you handle feedback?',
    ],
    tips: `Research ${company} thoroughly. Review common interview questions for ${role} positions. Prepare specific examples from your experience that demonstrate relevant skills.`,
  };
}