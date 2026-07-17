import { getPool } from '../services/postgres.js';
import { geminiJSON, isGeminiConfigured } from '../services/ai/geminiClient.js';

// POST /emails - Generate email
export const generateEmail = async (req, res, next) => {
  try {
    const { resumeId, jobId, emailType, recipient, subject, tone = 'professional' } = req.body;
    const userId = req.user.id;

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

      // Get job if provided
      let job = null;
      if (jobId) {
        const jobResult = await client.query('SELECT * FROM "Job" WHERE id = $1', [jobId]);
        job = jobResult.rows[0] || null;
      }

      // Generate email content using AI
      const emailContent = await generateEmailContent(resume, job, emailType, recipient, subject, tone);

      // Save email template
      const emailResult = await client.query(
        `INSERT INTO "EmailTemplate" ("userId", name, subject, body, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          userId,
          emailType || 'Follow-up Email',
          emailContent.subject,
          emailContent.body,
        ]
      );

      res.status(200).json({
        success: true,
        email: emailResult.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in generateEmail:', error);
    next(error);
  }
};

// GET /emails - List all saved emails
export const listEmails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        `SELECT * FROM "EmailTemplate" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
        [userId]
      );

      res.status(200).json({
        success: true,
        emails: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /emails/:id - Get specific email
export const getEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT * FROM "EmailTemplate" WHERE id = $1 AND "userId" = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Email template not found' });
      }

      res.status(200).json({
        success: true,
        email: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to generate email content
async function generateEmailContent(resume, job, emailType, recipient, subject, tone) {
  const prompt = `Write a professional email for job application follow-up.

Resume:
${resume ? JSON.stringify(resume.parsedData || {}, null, 2) : 'No resume provided'}

${job ? `Job Details:\nCompany: ${job.company}\nTitle: ${job.title}\n` : ''}
${recipient ? `Recipient: ${recipient}\n` : ''}
${subject ? `Subject: ${subject}\n` : ''}

Email Type: ${emailType || 'Follow-up'}
Tone: ${tone}

Return a JSON object with:
- subject: Email subject line
- body: Full email body (plain text, not markdown)

Format as valid JSON only.`;

  try {
    if (isGeminiConfigured()) {
      return await geminiJSON(prompt);
    } else if (process.env.GROQ_API_KEY) {
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
    console.error('AI email generation error:', error);
  }

  // Fallback template
  const company = job?.company || 'Company';
  return {
    subject: subject || `Following up on ${job?.title || 'Application'}`,
    body: `Dear ${recipient || 'Hiring Manager'},\n\nI hope this email finds you well. I wanted to follow up on my application for the ${job?.title || 'position'} at ${company}.\n\n${resume?.parsedData?.summary ? `My background in ${resume.parsedData.skills?.slice(0, 3).join(', ') || 'relevant fields'} would be a great fit for your team.\n\n` : ''}\nI would welcome the opportunity to discuss how I can contribute to your organization.\n\nThank you for your time and consideration.\n\nBest regards,\n${resume?.parsedData?.name || 'Candidate'}`,
  };
}
