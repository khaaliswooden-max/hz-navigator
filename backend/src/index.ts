import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import healthRoutes from './routes/health.js';
import hubzoneRoutes from './routes/hubzones.js';

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

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.info(`🚀 HZ Navigator API running on http://localhost:${PORT}`);
  console.info(`📊 Health check: http://localhost:${PORT}/api/health`);
});

export default app;

