/**
 * Server entry point — configures middleware, CORS, and starts Express.
 *
 * CORS is configured BEFORE all routes and body-parsers to ensure
 * preflight OPTIONS requests are handled first.
 *
 * Allowed origins:
 *   - FRONTEND_URL env var (set in production — your Vercel deployment URL)
 *   - CLIENT_ORIGIN env var (comma-separated list for local development,
 *     defaulting to localhost:5173 and chrome-extension origins)
 *   - Requests with no origin (server-to-server, curl, Postman, etc.)
 */

import { env } from '../config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import router from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { requestLogger } from '../middleware/requestLogger.js';
import { logger } from '../core/logger/index.js';

const app = express();
const port = env.port;

// ---------------------------------------------------------------------------
// 1. Security headers — applied before CORS to cover all responses
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// 2. CORS — must be registered before express.json()/urlencoded() and routes
//    so that OPTIONS preflight requests are handled correctly.
// ---------------------------------------------------------------------------

// Build the list of allowed origins:
//   - If FRONTEND_URL is set (production / Render env), add it first
//   - Parse CLIENT_ORIGIN list (comma-separated — used in development)
//   - Always allow requests with no origin (server tools, curl, extensions)
const allowedOrigins = [];

// Production frontend URL (set via Render env variable FRONTEND_URL)
if (env.frontendUrl) {
  allowedOrigins.push(env.frontendUrl);
}

// Development / local origins from CLIENT_ORIGIN (comma-separated)
const localOrigins = env.clientOrigin.split(',').map(o => o.trim());
allowedOrigins.push(...localOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin → non-browser client
      if (!origin) {
        return callback(null, true);
      }

      // Origin is in the allowed list → accept
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow chrome-extension://* origins for the browser extension
      if (origin.startsWith('chrome-extension://')) {
        return callback(null, true);
      }

      // Allow requests from job sites
      const jobSites = ['naukri.com', 'linkedin.com', 'indeed.com', 'wellfound.com', 'greenhouse.io', 'lever.co', 'workday.com', 'ashby.com', 'smartrecruiters.com', 'glassdoor.com'];
      if (jobSites.some(site => origin.includes(site))) {
        return callback(null, true);
      }

      // Everything else → reject
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging
app.use(requestLogger);

// ---------------------------------------------------------------------------
// 3. Body parsers & cookies
// ---------------------------------------------------------------------------
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------------------------------------------------------------------------
// 4. API routes
// ---------------------------------------------------------------------------
app.use('/', router);

// ---------------------------------------------------------------------------
// 5. Error handling (must be last)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// 6. Start server
// ---------------------------------------------------------------------------
const server = app.listen(port, () => {
  logger.info(`AI Resume Maker API started`, { port, env: process.env.NODE_ENV });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`);
  } else {
    logger.error('Server error', { error: error.message });
  }
});

export default app;