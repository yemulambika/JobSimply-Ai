import { getPool } from '../services/postgres.js';

// Middleware to check admin role
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// GET /admin/stats - Get admin statistics
export const getAdminStats = async (req, res, next) => {
  try {
    const client = await getPool().connect();

    try {
      const [userCount, jobCount, resumeCount, applicationCount] = await Promise.all([
        client.query('SELECT COUNT(*) as count FROM "User"'),
        client.query('SELECT COUNT(*) as count FROM "Job"'),
        client.query('SELECT COUNT(*) as count FROM "Resume"'),
        client.query('SELECT COUNT(*) as count FROM "Application"'),
      ]);

      const stats = {
        users: parseInt(userCount.rows[0].count),
        jobs: parseInt(jobCount.rows[0].count),
        resumes: parseInt(resumeCount.rows[0].count),
        applications: parseInt(applicationCount.rows[0].count),
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

// GET /admin/users - List all users
export const listUsers = async (req, res, next) => {
  try {
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT id, email, name, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 100'
      );

      res.status(200).json({
        success: true,
        users: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /admin/analytics - Get platform analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const client = await getPool().connect();

    try {
      // Job sources distribution
      const jobSources = await client.query(
        `SELECT source, COUNT(*) as count FROM "Job" GROUP BY source ORDER BY count DESC`
      );

      // Application statuses distribution
      const appStatuses = await client.query(
        `SELECT status, COUNT(*) as count FROM "Application" GROUP BY status ORDER BY count DESC`
      );

      // Recent activity (last 7 days)
      const recentJobs = await client.query(
        `SELECT COUNT(*) as count FROM "Job" WHERE "createdAt" > NOW() - INTERVAL '7 days'`
      );

      const recentResumes = await client.query(
        `SELECT COUNT(*) as count FROM "Resume" WHERE "createdAt" > NOW() - INTERVAL '7 days'`
      );

      res.status(200).json({
        success: true,
        analytics: {
          jobSources: jobSources.rows,
          applicationStatuses: appStatuses.rows,
          recentActivity: {
            jobs: parseInt(recentJobs.rows[0].count),
            resumes: parseInt(recentResumes.rows[0].count),
          },
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};