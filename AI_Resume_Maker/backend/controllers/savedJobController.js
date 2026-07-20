import { getPool } from '../services/postgres.js';

// POST /saved-jobs - Save a job
export const saveJob = async (req, res, next) => {
  try {
    const { jobId, notes } = req.body;
    const userId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    const client = await getPool().connect();
    try {
      await ensureSavedJobTable(client);
      
      // Verify job exists
      const jobResult = await client.query('SELECT * FROM "Job" WHERE id = $1', [jobId]);
      if (jobResult.rows.length === 0) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Check if already saved
      const existingResult = await client.query(
        'SELECT id FROM "SavedJob" WHERE "userId" = $1 AND "jobId" = $2',
        [userId, jobId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Job already saved',
          savedJob: { id: existingResult.rows[0].id },
        });
      }

      const result = await client.query(
        `INSERT INTO "SavedJob" ("userId", "jobId", notes, "createdAt")
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, jobId, notes || null]
      );

      res.status(201).json({
        success: true,
        savedJob: { id: result.rows[0].id },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Ensure SavedJob table exists
const ensureSavedJobTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "SavedJob" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
      notes TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Create unique index for userId + jobId
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "SavedJob_userId_jobId_unique"
    ON "SavedJob" ("userId", "jobId")
  `);
};

// GET /saved-jobs - List all saved jobs
export const listSavedJobs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      await ensureSavedJobTable(client);
      // Include both url and jobUrl for extension compatibility
      const result = await client.query(
        `SELECT sj.*, j.title, j.company, j.location, j.description, j.url, j."jobUrl", j.salary, j."employmentType", j."isRemote", j."atsScore", j."matchScore"
         FROM "SavedJob" sj
         JOIN "Job" j ON sj."jobId" = j.id
         WHERE sj."userId" = $1
         ORDER BY sj."createdAt" DESC`,
        [userId]
      );

      res.status(200).json({
        success: true,
        savedJobs: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /saved-jobs/:id - Remove saved job
export const removeSavedJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      await ensureSavedJobTable(client);
      const result = await client.query(
        'DELETE FROM "SavedJob" WHERE id = $1 AND "userId" = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Saved job not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Saved job removed',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /saved-jobs/:id - Check if job is saved
export const checkSavedJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      await ensureSavedJobTable(client);
      const result = await client.query(
        'SELECT id FROM "SavedJob" WHERE "userId" = $1 AND "jobId" = $2',
        [userId, jobId]
      );

      res.status(200).json({
        success: true,
        isSaved: result.rows.length > 0,
        savedJobId: result.rows[0]?.id || null,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};