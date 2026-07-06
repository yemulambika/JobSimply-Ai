import { getPool } from '../services/postgres.js';

// POST /applications - Track a new application
export const createApplication = async (req, res, next) => {
  try {
    const { jobId, resumeId, status = 'applied', notes } = req.body;
    const userId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    const client = await getPool().connect();
    try {
      // Verify job exists
      const jobResult = await client.query('SELECT * FROM "Job" WHERE id = $1', [jobId]);
      if (jobResult.rows.length === 0) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Verify resume belongs to user if provided
      if (resumeId) {
        const resumeResult = await client.query(
          'SELECT * FROM "Resume" WHERE id = $1 AND "userId" = $2',
          [resumeId, userId]
        );
        if (resumeResult.rows.length === 0) {
          return res.status(404).json({ message: 'Resume not found' });
        }
      }

      const result = await client.query(
        `INSERT INTO "Application" ("userId", "jobId", "resumeId", status, notes, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [userId, jobId, resumeId || null, status, notes || null]
      );

      res.status(201).json({
        success: true,
        application: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /applications - List all applications
export const listApplications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const client = await getPool().connect();

    try {
      let query = `SELECT a.*, j.title as "jobTitle", j.company as "jobCompany", j.location as "jobLocation"
                 FROM "Application" a
                 JOIN "Job" j ON a."jobId" = j.id
                 WHERE a."userId" = $1`;
      const params = [userId];

      if (status) {
        query += ' AND a.status = $2';
        params.push(status);
      }

      query += ' ORDER BY a."createdAt" DESC';

      const result = await client.query(query, params);

      res.status(200).json({
        success: true,
        applications: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /applications/:id - Get specific application
export const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        `SELECT a.*, j.title as "jobTitle", j.company as "jobCompany", j.location as "jobLocation", r.title as "resumeTitle"
         FROM "Application" a
         JOIN "Job" j ON a."jobId" = j.id
         LEFT JOIN "Resume" r ON a."resumeId" = r.id
         WHERE a.id = $1 AND a."userId" = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }

      res.status(200).json({
        success: true,
        application: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// PATCH /applications/:id - Update application status
export const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        `UPDATE "Application" SET status = COALESCE($1, status), notes = COALESCE($2, notes), "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $3 AND "userId" = $4
         RETURNING *`,
        [status, notes, id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }

      res.status(200).json({
        success: true,
        application: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /applications/:id - Delete application
export const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'DELETE FROM "Application" WHERE id = $1 AND "userId" = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Application deleted successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /applications/stats - Get application statistics
export const getApplicationStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        `SELECT 
          status,
          COUNT(*) as count
         FROM "Application"
         WHERE "userId" = $1
         GROUP BY status
         ORDER BY count DESC`,
        [userId]
      );

      const stats = {
        total: result.rows.reduce((acc, row) => acc + parseInt(row.count), 0),
        byStatus: result.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
      };

      res.status(200).json({
        success: true,
        stats,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};