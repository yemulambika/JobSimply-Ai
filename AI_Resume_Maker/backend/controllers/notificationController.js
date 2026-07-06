import { getPool } from '../services/postgres.js';

// GET /notifications - List all notifications
export const listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { read, limit = 50, offset = 0 } = req.query;
    const client = await getPool().connect();

    try {
      let query = 'SELECT * FROM "Notification" WHERE "userId" = $1';
      const params = [userId];

      if (read !== undefined) {
        query += ' AND "read" = $2';
        params.push(read === 'true');
      }

      query += ' ORDER BY "createdAt" DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit), parseInt(offset));

      const result = await client.query(query, params);

      res.status(200).json({
        success: true,
        notifications: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /notifications/unread-count - Get unread count
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM "Notification" WHERE "userId" = $1 AND "read" = false',
        [userId]
      );

      res.status(200).json({
        success: true,
        unreadCount: parseInt(result.rows[0].count),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/:id/read - Mark notification as read
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'UPDATE "Notification" SET "read" = true WHERE id = $1 AND "userId" = $2 RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.status(200).json({
        success: true,
        notification: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/read-all - Mark all notifications as read
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      await client.query(
        'UPDATE "Notification" SET "read" = true WHERE "userId" = $1',
        [userId]
      );

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// DELETE /notifications/:id - Delete notification
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'DELETE FROM "Notification" WHERE id = $1 AND "userId" = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Notification deleted',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to create notification
export async function createNotification(userId, type, title, message, data = {}) {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO "Notification" ("userId", type, title, message, data, "createdAt")
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, type, title, message, JSON.stringify(data)]
    );
  } finally {
    client.release();
  }
}