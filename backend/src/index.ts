/**
 * HZ Navigator API Server
 * 
 * Main entry point with comprehensive security middleware:
 * - Rate limiting (auth, API, upload endpoints)
 * - Input sanitization (XSS, SQL injection prevention)
 * - CORS with strict origin whitelist
 * - Security headers (Helmet, CSP, HSTS)
 * - HTTPS enforcement
 * - Audit logging
 */

import dotenv from 'dotenv';
import express, { Application, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Security middleware
import {
  corsMiddleware,
  helmetMiddleware,
  permissionsPolicyMiddleware,
  httpsEnforcement,
  requestIdMiddleware,
  configureTrustProxy,
} from './middleware/security.js';
import {
  apiRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
} from './middleware/rateLimit.js';
import { sanitizeBody, sanitizeQuery, sanitizeParams, checkSqlInjection } from './middleware/sanitize.js';
import { createAuditMiddleware } from './middleware/auditMiddleware.js';

// Error handling middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

// Routes
import adminRoutes from './routes/admin.js';
import agencyRoutes from './routes/agency.js';
import alertRoutes from './routes/alerts.js';
import analyticsRoutes from './routes/analytics.js';
import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contracts.js';
import complianceRoutes from './routes/compliance.js';
import documentRoutes from './routes/documents.js';
import healthRoutes from './routes/health.js';
import hubzoneRoutes from './routes/hubzones.js';
import mapRoutes from './routes/map.js';
import ocrRoutes from './routes/ocr.js';

// Performance monitoring
import { performanceMonitor } from './middleware/performanceMonitor.js';
import metricsRoutes from './routes/metrics.js';
import { validateEnvironment } from './config/index.js';
import { schedulerService } from './services/schedulerService.js';
import { mapUpdateJobManager } from './jobs/mapUpdateJob.js';
import { documentProcessingJobManager } from './jobs/documentProcessingJob.js';

const app: Application = express();
const PORT = process.env['APP_PORT'] ?? 3001;
const isProduction = process.env['NODE_ENV'] === 'production';

// ===== Trust Proxy Configuration =====
// Required for rate limiting behind load balancers
app.set('trust proxy', configureTrustProxy());

// ===== Security Middleware (Order Matters) =====

// 1. Request ID for tracking
app.use(requestIdMiddleware);

// 2. HTTPS enforcement (production only)
if (isProduction) {
  app.use(httpsEnforcement);
}

// 3. Security headers (Helmet)
app.use(helmetMiddleware);

// 4. Additional security headers
app.use(permissionsPolicyMiddleware);

// 5. CORS
app.use(corsMiddleware);

// ===== Request Parsing =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Input Sanitization =====
app.use(sanitizeQuery);
app.use(sanitizeParams);
app.use(checkSqlInjection);

// ===== Performance Monitoring =====
app.use(performanceMonitor);

// ===== Logging =====
// Custom morgan format with request ID
morgan.token('request-id', (req: Request) => (req as Request & { requestId?: string }).requestId ?? '-');
const logFormat = isProduction
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :request-id :response-time ms'
  : ':method :url :status :response-time ms - :request-id';
app.use(morgan(logFormat));

// ===== Audit Logging =====
app.use(createAuditMiddleware({
  skipPaths: ['/api/health', '/api/health/ready', '/api/health/live', '/favicon.ico'],
}));

// ===== Health Check Routes (No Rate Limiting) =====
app.use('/api/health', healthRoutes);

// ===== Metrics Routes (Admin protected internally) =====
app.use('/api/metrics', metricsRoutes);

// ===== Authentication Routes (Strict Rate Limiting) =====
app.use('/api/auth', authRateLimiter, sanitizeBody(), authRoutes);

// ===== Document Upload Routes (Upload Rate Limiting) =====
app.use('/api/documents/init-upload', uploadRateLimiter);
app.use('/api/documents/bulk', uploadRateLimiter);

// ===== Admin Routes (Admin Rate Limiting) =====
app.use('/api/v1/admin', adminRateLimiter);

// ===== API Routes (Standard Rate Limiting) =====
app.use('/api/hubzones', apiRateLimiter, hubzoneRoutes);
app.use('/api/v1', apiRateLimiter, alertRoutes);
app.use('/api/v1', apiRateLimiter, complianceRoutes);
app.use('/api/v1', apiRateLimiter, mapRoutes);
app.use('/api/v1', apiRateLimiter, adminRoutes);
app.use('/api/agency', apiRateLimiter, agencyRoutes);
app.use('/api/analytics', apiRateLimiter, analyticsRoutes);
app.use('/api/contracts', apiRateLimiter, contractRoutes);
app.use('/api/documents', apiRateLimiter, documentRoutes);
app.use('/api/ocr', apiRateLimiter, ocrRoutes);

// ===== Error Handling =====
app.use(notFoundHandler);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log errors to audit log
  const { auditService } = require('./services/auditService.js');
  auditService.logApiError(req, err, 500).catch(console.error);
  errorHandler(err as Parameters<typeof errorHandler>[0], req, res, next);
});

// ===== Server Startup =====
async function startServer(): Promise<void> {
  try {
    // Validate environment and secrets
    await validateEnvironment();

    // Start server
    app.listen(PORT, () => {
      console.info('');
      console.info('🔒 ================================');
      console.info('🚀 HZ Navigator API');
      console.info('🔒 ================================');
      console.info('');
      console.info(`📍 Server:      http://localhost:${PORT}`);
      console.info(`📊 Health:      http://localhost:${PORT}/api/health`);
      console.info(`🌍 Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
      console.info('');
      console.info('🛡️  Security Features:');
      console.info('   ✓ Rate limiting enabled');
      console.info('   ✓ CORS whitelist configured');
      console.info('   ✓ Helmet security headers');
      console.info('   ✓ Input sanitization');
      console.info('   ✓ SQL injection protection');
      console.info('   ✓ Audit logging');
      console.info('   ✓ Performance monitoring');
      if (isProduction) {
        console.info('   ✓ HTTPS enforcement');
        console.info('   ✓ HSTS enabled');
      }
      console.info('');
      console.info(`📈 Metrics:     http://localhost:${PORT}/api/metrics/health`);
      console.info('');

      // Start scheduled jobs in production
      if (isProduction) {
        // Start compliance scheduler
        schedulerService.start();
        console.info('📅 Compliance scheduler started');

        // Start quarterly HUBZone map update job
        mapUpdateJobManager.start();
        console.info('🗺️  HUBZone map update job started (quarterly)');

        // Start document OCR processing job
        documentProcessingJobManager.start();
        console.info('📄 Document OCR processing job started');
        console.info('');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.info('SIGTERM received, shutting down gracefully...');

  // Stop scheduled jobs
  schedulerService.stop();
  mapUpdateJobManager.stop();
  documentProcessingJobManager.stop();

  // Close database connections
  const { db } = await import('./services/database.js');
  await db.close();

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
