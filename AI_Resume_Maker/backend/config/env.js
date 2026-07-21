import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  databaseUrl: process.env.DATABASE_URL || '',
  /**
   * FRONTEND_URL: Single frontend origin (e.g. Vercel deployment URL).
   * Used in CORS to allow production frontend to access the API.
   * If not set, CORS falls back to CLIENT_ORIGIN for local development.
   */
  frontendUrl: process.env.FRONTEND_URL || '',
  /**
   * CLIENT_ORIGIN: Comma-separated list of allowed origins for local development.
   * Can include chrome-extension://* for extension access during development.
   */
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5000,http://localhost:5000,http://127.0.0.1:5001,http://localhost:5001,chrome-extension://*',
};