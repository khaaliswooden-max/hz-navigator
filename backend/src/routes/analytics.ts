import { Router, Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import type { DateRange, ReportConfig, ContractorDirectoryFilters, ExportFormat, ReportType } from '../types/analytics.js';

const router = Router();

/**
 * Parse date range from query parameters
 */
function parseDateRange(startDate?: string, endDate?: string): DateRange {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const end = endDate ? new Date(endDate) : now;
  return { startDate: start, endDate: end };
}

/**
 * GET /api/analytics/metrics/:agencyId
 * Get agency metrics summary
 */
router.get('/metrics/:agencyId', async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.params;
    const dateRange = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const metrics = await analyticsService.getAgencyMetrics(agencyId, dateRange);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error getting agency metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agency metrics',
    });
  }
});

/**
 * GET /api/analytics/dashboard/:agencyId
 * Get full analytics dashboard data
 */
router.get('/dashboard/:agencyId', async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.params;
    const dateRange = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const dashboard = await analyticsService.getAnalyticsDashboard(agencyId, dateRange);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('Error getting analytics dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics dashboard',
    });
  }
});

/**
 * GET /api/analytics/contractors
 * Get contractor directory with filters
 */
router.get('/contractors', async (req: Request, res: Response) => {
  try {
    const filters: ContractorDirectoryFilters = {
      search: req.query.search as string,
      state: req.query.state as string,
      naicsCode: req.query.naicsCode as string,
      certificationStatus: req.query.certificationStatus as string,
      riskLevel: req.query.riskLevel as any,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await analyticsService.getContractorDirectory(filters);
    res.json({
      success: true,
      data: result.contractors,
      pagination: {
        total: result.total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(result.total / (filters.limit ?? 50)),
      },
    });
  } catch (error) {
    console.error('Error getting contractor directory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contractor directory',
    });
  }
});

/**
 * GET /api/analytics/contractors/export
 * Export contractor directory
 */
router.get('/contractors/export', async (req: Request, res: Response) => {
  try {
    const agencyId = req.query.agencyId as string ?? 'default';
    const format = (req.query.format as 'csv' | 'excel') ?? 'csv';

    const csvData = await analyticsService.exportContractorDirectory(agencyId, format);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contractor-directory-${Date.now()}.csv`);
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting contractor directory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export contractor directory',
    });
  }
});

/**
 * GET /api/analytics/contractor-stats/:agencyId
 * Get contractor statistics
 */
router.get('/contractor-stats/:agencyId', async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.params;
    const dateRange = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const stats = await analyticsService.getContractorStats(agencyId, dateRange);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting contractor stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contractor statistics',
    });
  }
});

/**
 * GET /api/analytics/geographic/:agencyId
 * Get geographic distribution data
 */
router.get('/geographic/:agencyId', async (req: Request, res: Response) => {
  try {
    const { agencyId } = req.params;
    const dateRange = parseDateRange(
      req.query.startDate as string,
      req.query.endDate as string
    );

    const distribution = await analyticsService.getGeographicDistribution(agencyId, dateRange);
    res.json({ success: true, data: distribution });
  } catch (error) {
    console.error('Error getting geographic distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get geographic distribution',
    });
  }
});

/**
 * POST /api/analytics/reports/generate
 * Generate a report
 */
router.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const { reportType, agencyId, startDate, endDate, format, filters, includeCharts, includeSummary } = req.body;

    if (!reportType || !agencyId) {
      res.status(400).json({
        success: false,
        error: 'Report type and agency ID are required',
      });
      return;
    }

    const config: ReportConfig = {
      reportType: reportType as ReportType,
      agencyId,
      dateRange: parseDateRange(startDate, endDate),
      format: (format as ExportFormat) ?? 'pdf',
      filters,
      includeCharts: includeCharts ?? true,
      includeSummary: includeSummary ?? true,
    };

    const report = await analyticsService.generateReport(config);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
    });
  }
});

/**
 * GET /api/analytics/reports/types
 * Get available report types
 */
router.get('/reports/types', (_req: Request, res: Response) => {
  const reportTypes = [
    {
      id: 'hubzone_goal_achievement',
      name: 'HUBZone Goal Achievement',
      description: 'Analysis of HUBZone contracting goal progress and achievement metrics for congressional reporting',
      category: 'Compliance',
      formats: ['pdf', 'excel'],
    },
    {
      id: 'contractor_directory',
      name: 'Contractor Directory',
      description: 'Comprehensive listing of HUBZone certified contractors with certification and compliance details',
      category: 'Directory',
      formats: ['pdf', 'excel', 'csv'],
    },
    {
      id: 'verification_history',
      name: 'Verification History',
      description: 'Summary of contractor verification activities, outcomes, and compliance trends',
      category: 'Audit',
      formats: ['pdf', 'excel'],
    },
    {
      id: 'contract_awards_summary',
      name: 'Contract Awards Summary',
      description: 'Detailed analysis of contract awards including HUBZone participation metrics',
      category: 'Contracts',
      formats: ['pdf', 'excel'],
    },
    {
      id: 'geographic_distribution',
      name: 'Geographic Distribution',
      description: 'Analysis of HUBZone contractor distribution by state and region',
      category: 'Analysis',
      formats: ['pdf', 'excel'],
    },
  ];

  res.json({ success: true, data: reportTypes });
});

export default router;

