// Job Tracker Controller - Comprehensive job application tracking
// Handles: Job statuses, timeline, notes, reminders, analytics

import { getPool } from '../services/postgres.js';

// Job status pipeline
export const JOB_STATUSES = {
  SAVED: 'saved',
  INTERESTED: 'interested',
  APPLIED: 'applied',
  ASSESSMENT: 'assessment',
  INTERVIEW: 'interview',
  TECHNICAL_ROUND: 'technical',
  HR_ROUND: 'hr',
  OFFER: 'offer',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  ACCEPTED: 'accepted'
};

// Status display names and colors
export const STATUS_CONFIG = {
  saved: { label: 'Saved', color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.15)' },
  interested: { label: 'Interested', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
  applied: { label: 'Applied', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  assessment: { label: 'Assessment', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  interview: { label: 'Interview', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  technical: { label: 'Technical', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  hr: { label: 'HR Round', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  offer: { label: 'Offer', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  rejected: { label: 'Rejected', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  withdrawn: { label: 'Withdrawn', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
  accepted: { label: 'Accepted', color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.15)' }
};

// Create job tracker table if not exists
async function ensureJobTrackerTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "JobTracker" (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      "jobId" INTEGER NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'saved',
      "appliedDate" TIMESTAMP,
      "lastUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "nextInterview" TIMESTAMP,
      "salaryOffered" TEXT,
      "salaryExpected" TEXT,
      notes TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "JobTracker_userId_jobId_unique"
    ON "JobTracker" ("userId", "jobId")
  `);
  
  // Create timeline table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "JobTrackerTimeline" (
      id SERIAL PRIMARY KEY,
      "trackerId" INTEGER NOT NULL REFERENCES "JobTracker"(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      notes TEXT,
      "interviewDate" TIMESTAMP,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Create or get tracker entry for a job
export const getOrCreateTracker = async (userId, jobId) => {
  const client = await getPool().connect();
  try {
    await ensureJobTrackerTable(client);
    
    // Check if exists
    const existing = await client.query(
      'SELECT * FROM "JobTracker" WHERE "userId" = $1 AND "jobId" = $2',
      [userId, jobId]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    
    // Create new
    const result = await client.query(
      `INSERT INTO "JobTracker" ("userId", "jobId", status, "createdAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, jobId, JOB_STATUSES.SAVED]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
};

// GET /api/tracker - Get all tracked jobs
export const getTrackerJobs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, search, limit = 50, offset = 0 } = req.query;
    
    const client = await getPool().connect();
    try {
      await ensureJobTrackerTable(client);
      
      let query = `
        SELECT jt.*, j.title, j.company, j.location, j."jobUrl", j.salary, j.source,
               j.description, j."requiredSkills", j."matchScore", j."atsScore",
               (SELECT json_agg(json_build_object(
                 'status', jtt.status,
                 'notes', jtt.notes,
                 'date', jtt."createdAt"
               ) ORDER BY jtt."createdAt" DESC)
               FROM "JobTrackerTimeline" jtt WHERE jtt."trackerId" = jt.id) as timeline
        FROM "JobTracker" jt
        JOIN "Job" j ON jt."jobId" = j.id
        WHERE jt."userId" = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;
      
      if (status && status !== 'all') {
        query += ` AND jt.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (j.title ILIKE $${paramIndex} OR j.company ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY jt."lastUpdated" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await client.query(query, params);
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) FROM "JobTracker" jt
        JOIN "Job" j ON jt."jobId" = j.id
        WHERE jt."userId" = $1
        ${status && status !== 'all' ? 'AND jt.status = $2' : ''}
        ${search ? `AND (j.title ILIKE $${status && status !== 'all' ? '$3' : '$2'} OR j.company ILIKE $${status && status !== 'all' ? '$3' : '$2'})` : ''}
      `;
      const countResult = await client.query(countQuery, params.slice(0, status || search ? -2 : 0));
      
      res.status(200).json({
        success: true,
        jobs: result.rows,
        total: parseInt(countResult.rows[0].count),
        statuses: Object.keys(STATUS_CONFIG)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/tracker/stats - Get tracker statistics
export const getTrackerStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const client = await getPool().connect();
    try {
      await ensureJobTrackerTable(client);
      
      // Get counts by status
      const statusCounts = await client.query(`
        SELECT status, COUNT(*) as count
        FROM "JobTracker"
        WHERE "userId" = $1
        GROUP BY status
      `, [userId]);
      
      // Get recent activity
      const recentActivity = await client.query(`
        SELECT jt.status, jt."lastUpdated", j.title, j.company
        FROM "JobTracker" jt
        JOIN "Job" j ON jt."jobId" = j.id
        WHERE jt."userId" = $1
        ORDER BY jt."lastUpdated" DESC
        LIMIT 5
      `, [userId]);
      
      // Get conversion rates
      const totalApplied = statusCounts.rows.find(r => r.status === 'applied')?.count || 0;
      const totalInterviews = statusCounts.rows
        .filter(r => ['interview', 'technical', 'hr'].includes(r.status))
        .reduce((sum, r) => sum + parseInt(r.count), 0);
      const totalOffers = statusCounts.rows.find(r => r.status === 'offer')?.count || 0;
      const totalAccepted = statusCounts.rows.find(r => r.status === 'accepted')?.count || 0;
      
      const interviewRate = totalApplied > 0 ? ((totalInterviews / totalApplied) * 100).toFixed(1) : 0;
      const offerRate = totalApplied > 0 ? ((totalOffers / totalApplied) * 100).toFixed(1) : 0;
      const acceptanceRate = totalOffers > 0 ? ((totalAccepted / totalOffers) * 100).toFixed(1) : 0;
      
      res.status(200).json({
        success: true,
        stats: {
          byStatus: statusCounts.rows.reduce((acc, r) => {
            acc[r.status] = parseInt(r.count);
            return acc;
          }, {}),
          totalTracked: statusCounts.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
          applied: totalApplied,
          interviews: totalInterviews,
          offers: totalOffers,
          accepted: totalAccepted,
          conversionRates: {
            interview: interviewRate,
            offer: offerRate,
            acceptance: acceptanceRate
          }
        },
        recentActivity: recentActivity.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tracker/:jobId - Update tracker status
export const updateTrackerStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    const { status, notes, interviewDate, salaryOffered, salaryExpected } = req.body;
    
    if (!status && !notes && !interviewDate) {
      return res.status(400).json({ error: 'At least one field is required' });
    }
    
    const client = await getPool().connect();
    try {
      await ensureJobTrackerTable(client);
      
      // Get or create tracker
      const tracker = await getOrCreateTracker(userId, parseInt(jobId));
      
      // Update fields
      const updateFields = ['"lastUpdated" = CURRENT_TIMESTAMP'];
      const params = [];
      let paramIndex = 1;
      
      if (status) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
        
        // Add to timeline if status changed
        if (status !== tracker.status) {
          await client.query(`
            INSERT INTO "JobTrackerTimeline" ("trackerId", status, notes, "createdAt")
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          `, [tracker.id, status, `Status changed to ${STATUS_CONFIG[status]?.label || status}`]);
        }
        
        // Set applied date if transitioning to applied
        if (status === JOB_STATUSES.APPLIED && !tracker.appliedDate) {
          updateFields.push('"appliedDate" = CURRENT_TIMESTAMP');
        }
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        params.push(notes);
        paramIndex++;
      }
      
      if (interviewDate !== undefined) {
        updateFields.push(`"nextInterview" = $${paramIndex}`);
        params.push(interviewDate ? new Date(interviewDate) : null);
        paramIndex++;
      }
      
      if (salaryOffered !== undefined) {
        updateFields.push(`"salaryOffered" = $${paramIndex}`);
        params.push(salaryOffered);
        paramIndex++;
      }
      
      if (salaryExpected !== undefined) {
        updateFields.push(`"salaryExpected" = $${paramIndex}`);
        params.push(salaryExpected);
        paramIndex++;
      }
      
      params.push(tracker.id);
      
      const result = await client.query(`
        UPDATE "JobTracker" 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);
      
      res.status(200).json({
        success: true,
        tracker: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// POST /api/tracker/:jobId/timeline - Add timeline entry
export const addTimelineEntry = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    const { status, notes, interviewDate } = req.body;
    
    const client = await getPool().connect();
    try {
      await ensureJobTrackerTable(client);
      
      // Get tracker
      const tracker = await getOrCreateTracker(userId, parseInt(jobId));
      
      // Add timeline entry
      const result = await client.query(`
        INSERT INTO "JobTrackerTimeline" ("trackerId", status, notes, "interviewDate", "createdAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `, [tracker.id, status || tracker.status, notes, interviewDate ? new Date(interviewDate) : null]);
      
      // Update tracker
      await client.query(`
        UPDATE "JobTracker" SET "lastUpdated" = CURRENT_TIMESTAMP WHERE id = $1
      `, [tracker.id]);
      
      res.status(201).json({
        success: true,
        entry: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tracker/:jobId - Remove from tracker
export const removeFromTracker = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    
    const client = await getPool().connect();
    try {
      await ensureJobTrackerTable(client);
      
      const result = await client.query(`
        DELETE FROM "JobTracker" 
        WHERE "userId" = $1 AND "jobId" = $2
        RETURNING id
      `, [userId, jobId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tracker entry not found' });
      }
      
      res.status(200).json({
        success: true,
        message: 'Removed from tracker'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/tracker/export - Export tracker data as CSV
export const exportTracker = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const client = await getPool().connect();
    try {
      await ensureJobTrackerTable(client);
      
      const result = await client.query(`
        SELECT jt.status, jt."appliedDate", jt."lastUpdated", jt."nextInterview",
               jt."salaryOffered", jt.notes, j.title, j.company, j.location, j."jobUrl"
        FROM "JobTracker" jt
        JOIN "Job" j ON jt."jobId" = j.id
        WHERE jt."userId" = $1
        ORDER BY jt."lastUpdated" DESC
      `, [userId]);
      
      // Convert to CSV
      const headers = ['Status', 'Applied Date', 'Last Updated', 'Next Interview', 
                       'Salary Offered', 'Notes', 'Title', 'Company', 'Location', 'URL'];
      
      const csv = [
        headers.join(','),
        ...result.rows.map(row => [
          STATUS_CONFIG[row.status]?.label || row.status,
          row.appliedDate ? new Date(row.appliedDate).toISOString().split('T')[0] : '',
          new Date(row.lastUpdated).toISOString().split('T')[0],
          row.nextInterview ? new Date(row.nextInterview).toISOString().split('T')[0] : '',
          row.salaryOffered || '',
          (row.notes || '').replace(/"/g, '""'),
          (row.title || '').replace(/"/g, '""'),
          (row.company || '').replace(/"/g, '""'),
          (row.location || '').replace(/"/g, '""'),
          row.jobUrl || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=job_tracker_export.csv');
      res.status(200).send(csv);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
