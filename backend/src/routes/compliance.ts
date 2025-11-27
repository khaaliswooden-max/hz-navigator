import { Router } from 'express';

import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { complianceMonitoringService } from '../services/complianceMonitoring.js';
import { complianceHistoryService } from '../services/complianceHistoryService.js';
import { schedulerService } from '../services/schedulerService.js';

import type { Response, NextFunction } from 'express';
import type { ReportPeriod } from '../types/compliance.js';

const router = Router();

/**
 * GET /api/v1/businesses/:businessId/compliance/current
 * Get current compliance status for a business
 */
router.get(
  '/businesses/:businessId/compliance/current',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;

      const compliance = await complianceMonitoringService.calculateCompliance(businessId as string);

      res.json({
        success: true,
        data: compliance,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/businesses/:businessId/compliance/history
 * Get compliance history for a business
 */
router.get(
  '/businesses/:businessId/compliance/history',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { startDate, endDate, days } = req.query;

      let start: Date;
      let end: Date = new Date();

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else if (days) {
        start = new Date();
        start.setDate(start.getDate() - parseInt(days as string, 10));
      } else {
        // Default to last 30 days
        start = new Date();
        start.setDate(start.getDate() - 30);
      }

      const history = await complianceHistoryService.getComplianceHistory(
        businessId as string,
        start,
        end
      );

      res.json({
        success: true,
        data: history,
        meta: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          count: history.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/businesses/:businessId/compliance/snapshot
 * Create a manual compliance snapshot
 */
router.post(
  '/businesses/:businessId/compliance/snapshot',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { notes } = req.body as { notes?: string };

      const snapshot = await complianceHistoryService.createSnapshot(
        businessId as string,
        {
          triggerType: 'manual',
          triggeredBy: req.user?.userId,
          notes,
        }
      );

      res.status(201).json({
        success: true,
        data: snapshot,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/businesses/:businessId/compliance/trend
 * Get compliance trend analysis
 */
router.get(
  '/businesses/:businessId/compliance/trend',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { days = '30' } = req.query;

      const trendAnalysis = await complianceHistoryService.analyzeComplianceTrend(
        businessId as string,
        parseInt(days as string, 10)
      );

      res.json({
        success: true,
        data: trendAnalysis,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/businesses/:businessId/compliance/report
 * Generate compliance report (PDF/JSON/HTML)
 */
router.get(
  '/businesses/:businessId/compliance/report',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { businessId } = req.params;
      const { 
        period = 'monthly', 
        format = 'json',
        startDate,
        endDate,
      } = req.query;

      const report = await complianceHistoryService.generateComplianceReport(
        businessId as string,
        period as ReportPeriod,
        {
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          generatedBy: req.user?.userId,
          format: format as 'pdf' | 'json' | 'html',
        }
      );

      // Return based on format
      if (format === 'pdf') {
        // Generate PDF content
        const pdfContent = generatePdfReport(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="compliance-report-${businessId}-${report.period}.pdf"`
        );
        res.send(pdfContent);
      } else if (format === 'html') {
        const htmlContent = generateHtmlReport(report);
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
      } else {
        res.json({
          success: true,
          data: report,
          meta: {
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/compliance/admin/summary
 * Get admin dashboard summary (admin only)
 */
router.get(
  '/compliance/admin/summary',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await complianceHistoryService.getAdminSummary();

      res.json({
        success: true,
        data: summary,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/compliance/admin/nightly-job
 * Manually trigger nightly job (admin only)
 */
router.post(
  '/compliance/admin/nightly-job',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await schedulerService.runJobNow('nightly-compliance-scan');

      res.json({
        success: true,
        data: result,
        meta: {
          triggeredBy: req.user?.userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/compliance/admin/jobs
 * Get scheduled jobs status (admin only)
 */
router.get(
  '/compliance/admin/jobs',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobs = schedulerService.getAllJobsStatus();

      res.json({
        success: true,
        data: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          enabled: job.enabled,
          lastRun: job.lastRun?.toISOString() ?? null,
          nextRun: job.nextRun?.toISOString() ?? null,
          schedule: job.schedule,
        })),
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/compliance/admin/jobs/:jobId
 * Enable/disable a scheduled job (admin only)
 */
router.put(
  '/compliance/admin/jobs/:jobId',
  authenticate,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params;
      const { enabled } = req.body as { enabled: boolean };

      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            message: 'enabled must be a boolean',
            code: 'INVALID_INPUT',
          },
        });
        return;
      }

      schedulerService.setJobEnabled(jobId as string, enabled);

      const job = schedulerService.getJobStatus(jobId as string);

      res.json({
        success: true,
        data: {
          id: job?.id,
          name: job?.name,
          enabled: job?.enabled,
          lastRun: job?.lastRun?.toISOString() ?? null,
          nextRun: job?.nextRun?.toISOString() ?? null,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate PDF report content
 * In production, use a library like pdfkit, puppeteer, or a PDF service
 */
function generatePdfReport(report: import('../types/compliance.js').ComplianceReport): Buffer {
  // Placeholder - in production, use pdfkit or similar library
  const content = `
HUBZone Compliance Report
=========================

Business: ${report.businessName}
Period: ${report.period}
Generated: ${report.generatedAt.toISOString()}

Executive Summary
-----------------
Overall Status: ${report.executiveSummary.overallStatus.toUpperCase()}
Compliance Score: ${report.complianceScore}/100
Risk Level: ${report.executiveSummary.riskLevel.toUpperCase()}

Key Findings:
${report.executiveSummary.keyFindings.map((f) => `  • ${f}`).join('\n')}

Critical Issues:
${report.executiveSummary.criticalIssues.map((i) => `  ⚠ ${i}`).join('\n') || '  None'}

Current Status
--------------
Residency: ${report.currentStatus.residency.percentage.toFixed(1)}% (${report.currentStatus.residency.isCompliant ? 'Compliant' : 'Non-Compliant'})
Principal Office: ${report.currentStatus.principalOffice.isCompliant ? 'Compliant' : 'Non-Compliant'}
Certification: ${report.currentStatus.certification.isExpired ? 'Expired' : `Valid (${report.currentStatus.certification.daysUntilExpiration} days remaining)`}
Ownership: ${report.currentStatus.ownership.isCompliant ? 'Compliant' : 'Non-Compliant'}

Trend Analysis
--------------
Residency Trend: ${report.trendAnalysis.residency.trend}
Current: ${report.trendAnalysis.residency.current.toFixed(1)}%
30-Day Prediction: ${report.trendAnalysis.residency.predictedIn30Days.toFixed(1)}%
${report.trendAnalysis.residency.daysUntilNonCompliant !== null ? `Days Until Non-Compliant: ${report.trendAnalysis.residency.daysUntilNonCompliant}` : ''}

Recommendations
---------------
${report.recommendations.map((r) => `[${r.priority.toUpperCase()}] ${r.title}\n  ${r.description}`).join('\n\n')}
`;

  return Buffer.from(content, 'utf-8');
}

/**
 * Generate HTML report content
 */
function generateHtmlReport(report: import('../types/compliance.js').ComplianceReport): string {
  const statusColor = report.executiveSummary.overallStatus === 'compliant' ? '#10b981' :
                      report.executiveSummary.overallStatus === 'at_risk' ? '#f59e0b' : '#ef4444';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compliance Report - ${report.businessName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 40px;
    }
    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 32px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .content { padding: 32px; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 20px; color: #1e3a5f; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; text-transform: uppercase; font-size: 12px; }
    .score-card { display: flex; align-items: center; gap: 24px; padding: 24px; background: #f9fafb; border-radius: 8px; margin-bottom: 16px; }
    .score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .metric-card { padding: 16px; background: #f9fafb; border-radius: 8px; }
    .metric-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .metric-card .value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .metric-card .status { font-size: 12px; margin-top: 4px; }
    .status-compliant { color: #10b981; }
    .status-warning { color: #f59e0b; }
    .status-critical { color: #ef4444; }
    .list { list-style: none; }
    .list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .list li:last-child { border-bottom: none; }
    .recommendation { padding: 16px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid; }
    .recommendation.critical { background: #fef2f2; border-color: #ef4444; }
    .recommendation.high { background: #fffbeb; border-color: #f59e0b; }
    .recommendation.medium { background: #eff6ff; border-color: #3b82f6; }
    .recommendation.low { background: #f0fdf4; border-color: #10b981; }
    .recommendation h4 { margin-bottom: 8px; }
    .chart-placeholder { background: #f3f4f6; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HUBZone Compliance Report</h1>
      <div class="meta">
        <strong>${report.businessName}</strong> • ${report.period.charAt(0).toUpperCase() + report.period.slice(1)} Report<br>
        ${report.startDate.toLocaleDateString()} - ${report.endDate.toLocaleDateString()}<br>
        Generated: ${report.generatedAt.toLocaleString()}
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>Executive Summary</h2>
        <div class="score-card">
          <div class="score-circle" style="background: ${statusColor};">
            ${report.complianceScore}
          </div>
          <div>
            <span class="status-badge" style="background: ${statusColor}; color: white;">
              ${report.executiveSummary.overallStatus.replace('_', ' ')}
            </span>
            <p style="margin-top: 8px;">
              Risk Level: <strong>${report.executiveSummary.riskLevel.toUpperCase()}</strong>
              ${report.executiveSummary.riskLevelChange !== 'unchanged' ? 
                `(${report.executiveSummary.riskLevelChange})` : ''}
            </p>
          </div>
        </div>
        
        ${report.executiveSummary.criticalIssues.length > 0 ? `
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h4 style="color: #991b1b; margin-bottom: 8px;">⚠️ Critical Issues</h4>
          <ul class="list">
            ${report.executiveSummary.criticalIssues.map((i) => `<li style="color: #7f1d1d;">${i}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        <h4 style="margin-bottom: 8px;">Key Findings</h4>
        <ul class="list">
          ${report.executiveSummary.keyFindings.map((f) => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      
      <div class="section">
        <h2>Current Status</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="label">HUBZone Residency</div>
            <div class="value">${report.currentStatus.residency.percentage.toFixed(1)}%</div>
            <div class="status ${report.currentStatus.residency.isCompliant ? 'status-compliant' : 'status-critical'}">
              ${report.currentStatus.residency.isCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
            </div>
          </div>
          <div class="metric-card">
            <div class="label">Principal Office</div>
            <div class="value">${report.currentStatus.principalOffice.isCompliant ? 'Valid' : 'Invalid'}</div>
            <div class="status ${report.currentStatus.principalOffice.isCompliant ? 'status-compliant' : 'status-critical'}">
              ${report.currentStatus.principalOffice.isCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
            </div>
          </div>
          <div class="metric-card">
            <div class="label">Certification</div>
            <div class="value">${report.currentStatus.certification.daysUntilExpiration ?? 0} days</div>
            <div class="status ${report.currentStatus.certification.isExpired ? 'status-critical' : 
              report.currentStatus.certification.isExpiringSoon ? 'status-warning' : 'status-compliant'}">
              ${report.currentStatus.certification.isExpired ? '✗ Expired' : 
                report.currentStatus.certification.isExpiringSoon ? '⚠ Expiring Soon' : '✓ Valid'}
            </div>
          </div>
          <div class="metric-card">
            <div class="label">Ownership</div>
            <div class="value">${report.currentStatus.ownership.ownershipPercentage.toFixed(0)}%</div>
            <div class="status ${report.currentStatus.ownership.isCompliant ? 'status-compliant' : 'status-critical'}">
              ${report.currentStatus.ownership.isCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
            </div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Trend Analysis</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="label">Residency Trend</div>
            <div class="value">${report.trendAnalysis.residency.trend}</div>
            <div class="status">Slope: ${report.trendAnalysis.residency.slope.toFixed(3)}%/day</div>
          </div>
          <div class="metric-card">
            <div class="label">30-Day Prediction</div>
            <div class="value">${report.trendAnalysis.residency.predictedIn30Days.toFixed(1)}%</div>
            <div class="status ${report.trendAnalysis.residency.predictedIn30Days >= 35 ? 'status-compliant' : 'status-critical'}">
              ${report.trendAnalysis.residency.predictedIn30Days >= 35 ? 'Above threshold' : 'Below threshold'}
            </div>
          </div>
          <div class="metric-card">
            <div class="label">Employee Trend</div>
            <div class="value">${report.trendAnalysis.employeeCount.trend}</div>
            <div class="status">Net change: ${report.trendAnalysis.employeeCount.netChange >= 0 ? '+' : ''}${report.trendAnalysis.employeeCount.netChange}</div>
          </div>
          <div class="metric-card">
            <div class="label">Data Points</div>
            <div class="value">${report.trendAnalysis.dataPoints}</div>
            <div class="status">Over ${report.trendAnalysis.periodDays} days</div>
          </div>
        </div>
        
        <div class="chart-placeholder" style="margin-top: 16px;">
          📊 Residency Trend Chart (See JSON data for chart values)
        </div>
      </div>
      
      <div class="section">
        <h2>Recommendations</h2>
        ${report.recommendations.map((r) => `
        <div class="recommendation ${r.priority}">
          <h4>${r.title}</h4>
          <p>${r.description}</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
            <strong>Impact:</strong> ${r.impact}<br>
            <strong>Effort:</strong> ${r.estimatedEffort}
            ${r.deadline ? `<br><strong>Deadline:</strong> ${r.deadline.toLocaleDateString()}` : ''}
          </p>
        </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default router;

