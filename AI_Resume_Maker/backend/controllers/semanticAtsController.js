/**
 * Semantic ATS Controller - Handles semantic similarity-based resume analysis
 * Uses sentence-transformer embeddings and pgvector for semantic search
 */

import { getPool } from '../services/postgres.js';
import SemanticATSEngine from '../services/semantic/SemanticATSEngine.js';
import ResumeTailoringService from '../services/semantic/ResumeTailoringService.js';
import { getEmbeddingService } from '../services/semantic/EmbeddingService.js';

// Initialize services
const semanticATSEngine = new SemanticATSEngine();
const resumeTailoringService = new ResumeTailoringService();
const embeddingService = getEmbeddingService();

/**
 * POST /semantic-ats/analyze - Analyze resume against job using semantic similarity
 */
export const analyzeSemantic = async (req, res, next) => {
  console.log('[SemanticATS] ===== SEMANTIC ANALYSIS START =====');
  try {
    const { resumeId, jobId, jobDescription, jobTitle, company } = req.body;
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
      const resumeJSON = resume.baseResumeJSON || resume.parsedData || {};

      // Get job data if jobId provided
      let jobJSON = {};
      if (jobId) {
        const jobResult = await client.query(
          'SELECT * FROM "Job" WHERE id = $1',
          [jobId]
        );
        if (jobResult.rows.length > 0) {
          jobJSON = jobResult.rows[0];
        }
      }

      // Override with provided job description if available
      if (jobDescription) {
        jobJSON.description = jobDescription;
      }
      if (jobTitle) {
        jobJSON.title = jobTitle;
      }
      if (company) {
        jobJSON.company = company;
      }

      console.log('[SemanticATS] Resume JSON keys:', Object.keys(resumeJSON));
      console.log('[SemanticATS] Job JSON keys:', Object.keys(jobJSON));

      // Run semantic analysis
      const analysis = await semanticATSEngine.analyze(resumeJSON, jobJSON);

      console.log('[SemanticATS] Analysis complete. ATS Score:', analysis.atsScore);

      // Update resume embeddings if not present
      if (analysis.resumeEmbeddings && Object.keys(analysis.resumeEmbeddings).length > 0) {
        await updateResumeEmbeddings(client, resumeId, analysis.resumeEmbeddings);
      }

      // Update job embeddings if jobId provided
      if (jobId && analysis.jobEmbeddings && Object.keys(analysis.jobEmbeddings).length > 0) {
        await updateJobEmbeddings(client, jobId, analysis.jobEmbeddings);
      }

      res.status(200).json({
        success: true,
        analysis: {
          atsScore: analysis.atsScore,
          scores: analysis.scores,
          details: analysis.details,
          gapAnalysis: analysis.gapAnalysis,
          weights: analysis.weights,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SemanticATS] Error in analyzeSemantic:', error);
    next(error);
  }
};

/**
 * POST /semantic-ats/tailor - Tailor resume using semantic analysis
 */
export const tailorSemantic = async (req, res, next) => {
  console.log('[SemanticATS] ===== SEMANTIC TAILORING START =====');
  try {
    const { resumeId, jobId, jobDescription, jobTitle, company, options = {} } = req.body;
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
      const resumeJSON = resume.baseResumeJSON || resume.parsedData || {};

      // Get job data if jobId provided
      let jobJSON = {};
      if (jobId) {
        const jobResult = await client.query(
          'SELECT * FROM "Job" WHERE id = $1',
          [jobId]
        );
        if (jobResult.rows.length > 0) {
          jobJSON = jobResult.rows[0];
        }
      }

      // Override with provided job description if available
      if (jobDescription) {
        jobJSON.description = jobDescription;
      }
      if (jobTitle) {
        jobJSON.title = jobTitle;
      }
      if (company) {
        jobJSON.company = company;
      }

      console.log('[SemanticATS] Starting tailoring...');

      // Run semantic tailoring
      const result = await resumeTailoringService.tailorResume(resumeJSON, jobJSON, options);

      // Validate tailoring preserves factual accuracy
      const validation = resumeTailoringService.validateTailoring(resumeJSON, result.tailoredResume);
      if (!validation.valid) {
        console.error('[SemanticATS] Tailoring validation failed:', validation.errors);
        return res.status(500).json({
          success: false,
          message: 'Tailoring validation failed',
          errors: validation.errors,
        });
      }

      // Save tailored version
      const tailoredResult = await client.query(
        `INSERT INTO "TailoredResume" ("userId", "resumeId", "jobId", title, content, "jobDescription", tone, optimization, "atsScore", "matchScore", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          userId,
          resumeId,
          jobId || null,
          `Semantic Tailored for ${jobJSON.company || company || 'Custom Role'}`,
          JSON.stringify(result.tailoredResume),
          jobDescription || jobJSON.description || null,
          options.tone || 'professional',
          options.optimization || 'balanced',
          result.atsScore,
          result.analysis.atsScore,
        ]
      );

      console.log('[SemanticATS] Tailoring complete. Changes:', result.changes.length);

      res.status(200).json({
        success: true,
        tailored: tailoredResult.rows[0],
        changes: result.changes,
        analysis: result.analysis,
        validation,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SemanticATS] Error in tailorSemantic:', error);
    next(error);
  }
};

/**
 * POST /semantic-ats/embeddings/generate - Generate embeddings for a resume
 */
export const generateResumeEmbeddings = async (req, res, next) => {
  console.log('[SemanticATS] ===== GENERATE RESUME EMBEDDINGS =====');
  try {
    const { resumeId } = req.body;
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
      const resumeJSON = resume.baseResumeJSON || resume.parsedData || {};

      // Initialize embedding service if needed
      if (!embeddingService.isReady()) {
        await embeddingService.initialize();
      }

      // Generate embeddings
      const embeddings = await embeddingService.embedResume(resumeJSON);

      console.log('[SemanticATS] Embeddings generated:', Object.keys(embeddings));

      // Update database
      await updateResumeEmbeddings(client, resumeId, embeddings);

      res.status(200).json({
        success: true,
        message: 'Embeddings generated and saved',
        sections: Object.keys(embeddings),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SemanticATS] Error in generateResumeEmbeddings:', error);
    next(error);
  }
};

/**
 * POST /semantic-ats/embeddings/job - Generate embeddings for a job
 */
export const generateJobEmbeddings = async (req, res, next) => {
  console.log('[SemanticATS] ===== GENERATE JOB EMBEDDINGS =====');
  try {
    const { jobId } = req.body;
    const userId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    const client = await getPool().connect();
    try {
      // Get job data
      const jobResult = await client.query(
        'SELECT * FROM "Job" WHERE id = $1 AND ("userId" = $2 OR "userId" IS NULL)',
        [jobId, userId]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const job = jobResult.rows[0];

      // Initialize embedding service if needed
      if (!embeddingService.isReady()) {
        await embeddingService.initialize();
      }

      // Generate embeddings
      const embeddings = await embeddingService.embedJob(job);

      console.log('[SemanticATS] Job embeddings generated:', Object.keys(embeddings));

      // Update database
      await updateJobEmbeddings(client, jobId, embeddings);

      res.status(200).json({
        success: true,
        message: 'Job embeddings generated and saved',
        sections: Object.keys(embeddings),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SemanticATS] Error in generateJobEmbeddings:', error);
    next(error);
  }
};

/**
 * GET /semantic-ats/similar-jobs - Find jobs similar to a resume using embeddings
 */
export const findSimilarJobs = async (req, res, next) => {
  console.log('[SemanticATS] ===== FIND SIMILAR JOBS =====');
  try {
    const { resumeId, limit = 10 } = req.query;
    const userId = req.user.id;

    if (!resumeId) {
      return res.status(400).json({ message: 'Resume ID is required' });
    }

    const client = await getPool().connect();
    try {
      // Get resume embeddings
      const resumeResult = await client.query(
        'SELECT "skillsEmbedding", "experienceEmbedding", "summaryEmbedding" FROM "Resume" WHERE id = $1 AND "userId" = $2',
        [resumeId, userId]
      );

      if (resumeResult.rows.length === 0) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      const resume = resumeResult.rows[0];

      if (!resume.skillsEmbedding) {
        return res.status(400).json({ 
          message: 'Resume embeddings not generated. Call /semantic-ats/embeddings/generate first.' 
        });
      }

      // Use pgvector to find similar jobs
      const similarJobsResult = await client.query(
        `SELECT j.*, 
         1 - (j."skillsEmbedding" <=> $1::vector) as skills_similarity,
         1 - (j."descriptionEmbedding" <=> COALESCE($2::vector, j."descriptionEmbedding")) as description_similarity
         FROM "Job" j
         WHERE j."skillsEmbedding" IS NOT NULL
         ORDER BY (j."skillsEmbedding" <=> $1::vector) ASC
         LIMIT $3`,
        [resume.skillsEmbedding, resume.summaryEmbedding, parseInt(limit)]
      );

      res.status(200).json({
        success: true,
        similarJobs: similarJobsResult.rows.map(job => ({
          ...job,
          similarityScore: Math.round((job.skills_similarity + job.description_similarity) / 2 * 100),
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[SemanticATS] Error in findSimilarJobs:', error);
    next(error);
  }
};

/**
 * Helper function to update resume embeddings in database
 */
async function updateResumeEmbeddings(client, resumeId, embeddings) {
  const updateQuery = `
    UPDATE "Resume" 
    SET "skillsEmbedding" = $1,
        "experienceEmbedding" = $2,
        "educationEmbedding" = $3,
        "projectsEmbedding" = $4,
        "summaryEmbedding" = $5,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $6
  `;

  await client.query(updateQuery, [
    embeddings.skills ? `[${embeddings.skills.join(',')}]` : null,
    embeddings.experience ? `[${embeddings.experience.join(',')}]` : null,
    embeddings.education ? `[${embeddings.education.join(',')}]` : null,
    embeddings.projects ? `[${embeddings.projects.join(',')}]` : null,
    embeddings.summary ? `[${embeddings.summary.join(',')}]` : null,
    resumeId,
  ]);
}

/**
 * Helper function to update job embeddings in database
 */
async function updateJobEmbeddings(client, jobId, embeddings) {
  const updateQuery = `
    UPDATE "Job" 
    SET "skillsEmbedding" = $1,
        "descriptionEmbedding" = $2,
        "responsibilitiesEmbedding" = $3,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = $4
  `;

  await client.query(updateQuery, [
    embeddings.skills ? `[${embeddings.skills.join(',')}]` : null,
    embeddings.description ? `[${embeddings.description.join(',')}]` : null,
    embeddings.responsibilities ? `[${embeddings.responsibilities.join(',')}]` : null,
    jobId,
  ]);
}
