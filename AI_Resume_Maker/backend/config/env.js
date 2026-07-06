import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  databaseUrl: process.env.DATABASE_URL || '',
  // Include chrome-extension:// for extension access during development
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173,chrome-extension://*',
};