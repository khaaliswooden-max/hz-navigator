import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import adminRoutes from './routes/admin.js';
import alertRoutes from './routes/alerts.js';
import complianceRoutes from './routes/compliance.js';
import healthRoutes from './routes/health.js';
import hubzoneRoutes from './routes/hubzones.js';
import mapRoutes from './routes/map.js';
import { mapUpdateJobManager } from './jobs/mapUpdateJob.js';
import { schedulerService } from './services/schedulerService.js';

import type { Application } from 'express';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env['APP_PORT'] ?? 3001;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/hubzones', hubzoneRoutes);
app.use('/api/v1', alertRoutes);
app.use('/api/v1', complianceRoutes);
app.use('/api/v1', mapRoutes);
app.use('/api/v1', adminRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.info(`🚀 HZ Navigator API running on http://localhost:${PORT}`);
  console.info(`📊 Health check: http://localhost:${PORT}/api/health`);

  // Start scheduled jobs in production
  if (process.env['NODE_ENV'] === 'production') {
    // Start compliance scheduler
    schedulerService.start();
    console.info('📅 Compliance scheduler started');

    // Start quarterly HUBZone map update job
    mapUpdateJobManager.start();
    console.info('🗺️  HUBZone map update job started (quarterly)');
  }
});

export default app;

