import { getPool } from '../services/postgres.js';

// GET /settings - Get user settings
export const getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT * FROM "UserSettings" WHERE "userId" = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Create default settings
        const defaultSettings = await client.query(
          `INSERT INTO "UserSettings" ("userId", theme, "defaultTone", "emailSignature", "notificationPrefs", "createdAt", "updatedAt")
           VALUES ($1, 'dark', 'professional', '', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [userId]
        );
        return res.status(200).json({
          success: true,
          settings: defaultSettings.rows[0],
        });
      }

      res.status(200).json({
        success: true,
        settings: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// PATCH /settings - Update user settings
export const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { theme, defaultTone, emailSignature, notificationPrefs } = req.body;
    const client = await getPool().connect();

    try {
      // First check if settings exist
      const existing = await client.query(
        'SELECT id FROM "UserSettings" WHERE "userId" = $1',
        [userId]
      );

      let result;
      if (existing.rows.length === 0) {
        // Create new settings
        result = await client.query(
          `INSERT INTO "UserSettings" ("userId", theme, "defaultTone", "emailSignature", "notificationPrefs", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [userId, theme || 'dark', defaultTone || 'professional', emailSignature || '', notificationPrefs ? JSON.stringify(notificationPrefs) : '{}']
        );
      } else {
        // Update existing settings
        result = await client.query(
          `UPDATE "UserSettings" SET 
            theme = COALESCE($1, theme),
            "defaultTone" = COALESCE($2, "defaultTone"),
            "emailSignature" = COALESCE($3, "emailSignature"),
            "notificationPrefs" = COALESCE($4, "notificationPrefs"),
            "updatedAt" = CURRENT_TIMESTAMP
           WHERE "userId" = $5
           RETURNING *`,
          [theme, defaultTone, emailSignature, notificationPrefs ? JSON.stringify(notificationPrefs) : null, userId]
        );
      }

      res.status(200).json({
        success: true,
        settings: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

// GET /settings/preferences - Get specific preferences
export const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { section } = req.query;
    const client = await getPool().connect();

    try {
      const result = await client.query(
        'SELECT * FROM "UserSettings" WHERE "userId" = $1',
        [userId]
      );

      const settings = result.rows[0];
      if (!settings) {
        return res.status(200).json({
          success: true,
          preferences: {},
        });
      }

      // Return specific section if requested
      if (section) {
        return res.status(200).json({
          success: true,
          preferences: { [section]: settings[section] },
        });
      }

      res.status(200).json({
        success: true,
        preferences: settings,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};