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
    /**
     * origin callback:
     *   - Allow requests with no origin (Postman, curl, server scripts, Chrome extension)
     *   - Allow requests whose Origin matches an entry in allowedOrigins
     *   - Also allow chrome-extension:// origins
     *   - Reject everything else with a descriptive error
     */
    origin: (origin, callback) => {
      // No origin → non-browser client (e.g. curl, Postman, server scripts) or Chrome extension
      if (!origin) {
        console.log('[CORS] No origin - allowing request');
        return callback(null, true);
      }

      // Origin is in the allowed list → accept
      if (allowedOrigins.includes(origin)) {
        console.log('[CORS] Origin allowed:', origin);
        return callback(null, true);
      }

      // Also allow chrome-extension://* origins for the browser extension
      if (origin.startsWith('chrome-extension://')) {
        console.log('[CORS] Chrome extension origin allowed');
        return callback(null, true);
      }

      // Also allow requests from job sites (extension makes requests with their origin)
      const jobSites = ['naukri.com', 'linkedin.com', 'indeed.com', 'wellfound.com', 'greenhouse.io', 'lever.co', 'workday.com', 'ashby.com', 'smartrecruiters.com', 'glassdoor.com'];
      if (jobSites.some(site => origin.includes(site))) {
        console.log('[CORS] Job site origin allowed:', origin);
        return callback(null, true);
      }

      // Everything else → reject
      console.log('[CORS] Origin rejected:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    // credentials: true is required so that the browser sends cookies
    // (JWT token stored in httpOnly cookie) with cross-origin requests
    credentials: true,
    // Explicitly list HTTP methods the API accepts
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Headers the client is allowed to send
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Log all requests for debugging
app.use((req, res, next) => {
  console.log('[REQUEST]', req.method, req.path, '- Origin:', req.headers.origin || 'none');
  next();
});

// ---------------------------------------------------------------------------
// 3. Body parsers & cookies
// ---------------------------------------------------------------------------
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  console.log(`AI Resume Maker API listening on port ${port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[SERVER] Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${port} is already in use`);
  } else {
    console.error('[SERVER] Server error:', error);
  }
});

export default app;