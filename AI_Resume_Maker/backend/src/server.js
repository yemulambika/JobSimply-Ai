import { env } from '../config/env.js';
import { startJobCron } from '../services/jobCron.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import router from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { notFoundHandler } from '../middleware/notFound.js';

const app = express();
const port = env.port;

app.use(helmet());
const allowedOrigins = env.clientOrigin.split(',').map(o => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('chrome-extension://') ||
        origin.includes('.replit.dev') ||
        origin.includes('.repl.co') ||
        origin.includes('.replit.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', router);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`AI Resume Maker API listening on port ${port}`);
  // Start background job fetcher (runs immediately + every 6 hours)
  startJobCron();
});

export default app;