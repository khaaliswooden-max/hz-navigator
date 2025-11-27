import { db } from './database.js';
import { complianceMonitoringService } from './complianceMonitoring.js';
import { alertService } from './alertService.js';

import type {
  ComplianceSnapshot,
  SnapshotMetadata,
  TrendAnalysis,
  TrendDirection,
  TrendAlert,
  ComplianceReport,
  ReportPeriod,
  ExecutiveSummary,
  ReportChart,
  ChartDataPoint,
  ReportRecommendation,
  NightlyJobResult,
  JobError,
  AdminSummary,
  RiskLevel,
  ComplianceStatus,
} from '../types/compliance.js';

/**
 * Compliance History Service
 * 
 * Manages compliance snapshots, trend analysis, and reporting
 */
export class ComplianceHistoryService {
  /**
   * Create a point-in-time compliance snapshot for a business
   */
  async createSnapshot(
    businessId: string,
    metadata: Partial<SnapshotMetadata> = {}
  ): Promise<ComplianceSnapshot> {
    // Get current compliance status
    const compliance = await complianceMonitoringService.calculateCompliance(businessId);

    const snapshotMetadata: SnapshotMetadata = {
      triggerType: metadata.triggerType ?? 'manual',
      triggeredBy: metadata.triggeredBy,
      employeeChanges: metadata.employeeChanges,
      notes: metadata.notes,
    };

    const query = `
      INSERT INTO compliance_snapshots (
        business_id,
        snapshot_date,
        total_employees,
        hubzone_residents,
        residency_percentage,
        is_residency_compliant,
        is_principal_office_compliant,
        is_certification_valid,
        is_ownership_compliant,
        is_fully_compliant,
        risk_level,
        risk_score,
        certification_days_remaining,
        grace_period_days_remaining,
        ownership_percentage,
        metadata,
        created_at
      ) VALUES (
        $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      RETURNING *
    `;

    const result = await db.query<ComplianceSnapshot>(query, [
      businessId,
      compliance.residency.totalEmployees,
      compliance.residency.hubzoneResidents,
      compliance.residency.percentage,
      compliance.residency.isCompliant,
      compliance.principalOffice.isCompliant,
      !compliance.certification.isExpired,
      compliance.ownership.isCompliant,
      compliance.isFullyCompliant,
      compliance.riskAssessment.riskLevel,
      compliance.riskAssessment.riskScore,
      compliance.certification.daysUntilExpiration,
      compliance.principalOffice.gracePeriodDaysRemaining,
      compliance.ownership.ownershipPercentage,
      JSON.stringify(snapshotMetadata),
    ]);

    return this.mapSnapshotRow(result.rows[0]);
  }

  /**
   * Get compliance history for a business within date range
   */
  async getComplianceHistory(
    businessId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceSnapshot[]> {
    const query = `
      SELECT * FROM compliance_snapshots
      WHERE business_id = $1
        AND snapshot_date >= $2
        AND snapshot_date <= $3
      ORDER BY snapshot_date ASC
    `;

    const result = await db.query(query, [businessId, startDate, endDate]);
    return result.rows.map((row) => this.mapSnapshotRow(row));
  }

  /**
   * Analyze compliance trend for a business
   */
  async analyzeComplianceTrend(
    businessId: string,
    days: number = 30
  ): Promise<TrendAnalysis> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.getComplianceHistory(businessId, startDate, endDate);
    const currentCompliance = await complianceMonitoringService.calculateCompliance(businessId);

    // Calculate residency statistics
    const residencyValues = snapshots.map((s) => s.residencyPercentage);
    const residencyStats = this.calculateStatistics(residencyValues);
    const residencyTrend = this.calculateTrend(
      snapshots.map((s) => ({ date: s.snapshotDate, value: s.residencyPercentage }))
    );

    // Calculate risk score statistics
    const riskScores = snapshots.map((s) => s.riskScore);
    const riskStats = this.calculateStatistics(riskScores);

    // Calculate employee count statistics
    const employeeCounts = snapshots.map((s) => s.totalEmployees);
    const employeeStats = this.calculateStatistics(employeeCounts);
    const employeeTrend = this.calculateTrend(
      snapshots.map((s) => ({ date: s.snapshotDate, value: s.totalEmployees }))
    );

    // Predict future values
    const predicted30Days = this.predictValue(residencyTrend.slope, 30, currentCompliance.residency.percentage);
    const predicted90Days = this.predictValue(residencyTrend.slope, 90, currentCompliance.residency.percentage);

    // Calculate days until non-compliant
    const daysUntilNonCompliant = this.calculateDaysUntilThreshold(
      currentCompliance.residency.percentage,
      residencyTrend.slope,
      35 // Threshold
    );

    // Generate trend alerts
    const alerts = this.generateTrendAlerts(
      currentCompliance,
      residencyTrend,
      predicted30Days,
      daysUntilNonCompliant
    );

    // Generate recommendations
    const recommendations = this.generateTrendRecommendations(
      currentCompliance,
      residencyTrend,
      employeeTrend
    );

    return {
      businessId,
      analyzedAt: new Date(),
      periodDays: days,
      dataPoints: snapshots.length,
      residency: {
        current: currentCompliance.residency.percentage,
        average: residencyStats.average,
        minimum: residencyStats.minimum,
        maximum: residencyStats.maximum,
        trend: residencyTrend.direction,
        slope: residencyTrend.slope,
        predictedIn30Days: predicted30Days,
        predictedIn90Days: predicted90Days,
        daysUntilNonCompliant,
      },
      riskLevel: {
        current: currentCompliance.riskAssessment.riskLevel,
        trend: this.getRiskTrend(snapshots),
        averageScore: riskStats.average,
      },
      employeeCount: {
        current: currentCompliance.residency.totalEmployees,
        average: employeeStats.average,
        trend: employeeTrend.direction,
        netChange: employeeCounts.length > 0 
          ? currentCompliance.residency.totalEmployees - employeeCounts[0] 
          : 0,
      },
      alerts,
      recommendations,
    };
  }

  /**
   * Generate a compliance report
   */
  async generateComplianceReport(
    businessId: string,
    period: ReportPeriod,
    options: {
      startDate?: Date;
      endDate?: Date;
      generatedBy?: string;
      format?: 'pdf' | 'json' | 'html';
    } = {}
  ): Promise<ComplianceReport> {
    const { startDate, endDate } = this.getReportDateRange(period, options.startDate, options.endDate);
    const format = options.format ?? 'pdf';

    // Gather all data
    const [currentStatus, historicalData, trendAnalysis] = await Promise.all([
      complianceMonitoringService.calculateCompliance(businessId),
      this.getComplianceHistory(businessId, startDate, endDate),
      this.analyzeComplianceTrend(businessId, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))),
    ]);

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(
      currentStatus,
      historicalData,
      trendAnalysis
    );

    // Generate charts
    const charts = this.generateReportCharts(historicalData, trendAnalysis);

    // Generate recommendations
    const recommendations = this.generateReportRecommendations(
      currentStatus,
      trendAnalysis
    );

    // Calculate overall compliance score (0-100)
    const complianceScore = this.calculateComplianceScore(currentStatus);

    const report: ComplianceReport = {
      id: `report-${businessId}-${Date.now()}`,
      businessId,
      businessName: currentStatus.businessName,
      generatedAt: new Date(),
      generatedBy: options.generatedBy ?? 'system',
      period,
      startDate,
      endDate,
      executiveSummary,
      currentStatus,
      historicalData,
      trendAnalysis,
      charts,
      recommendations,
      complianceScore,
      format,
    };

    // Store report record
    await this.storeReportRecord(report);

    return report;
  }

  /**
   * Run nightly compliance job for all businesses
   */
  async runNightlyJob(): Promise<NightlyJobResult> {
    const jobId = `nightly-${Date.now()}`;
    const startedAt = new Date();
    const errors: JobError[] = [];
    let snapshotsCreated = 0;
    let alertsGenerated = 0;

    // Get all active businesses
    const businessesQuery = `
      SELECT id, name FROM businesses 
      WHERE is_active = true
    `;
    const businessesResult = await db.query<{ id: string; name: string }>(businessesQuery, []);
    const businesses = businessesResult.rows;

    const summary = {
      compliantBusinesses: 0,
      atRiskBusinesses: 0,
      nonCompliantBusinesses: 0,
      criticalAlerts: 0,
    };

    // Process each business
    for (const business of businesses) {
      try {
        // Create snapshot
        const snapshot = await this.createSnapshot(business.id, {
          triggerType: 'scheduled',
          notes: `Nightly job ${jobId}`,
        });
        snapshotsCreated++;

        // Categorize compliance status
        if (snapshot.isFullyCompliant) {
          summary.compliantBusinesses++;
        } else if (snapshot.riskLevel === 'critical' || snapshot.riskLevel === 'high') {
          summary.nonCompliantBusinesses++;
        } else {
          summary.atRiskBusinesses++;
        }

        // Generate alerts for issues
        const alerts = await alertService.generateAlerts(business.id);
        alertsGenerated += alerts.length;
        summary.criticalAlerts += alerts.filter((a) => a.severity === 'critical').length;

      } catch (error) {
        errors.push({
          businessId: business.id,
          businessName: business.name,
          error: (error as Error).message,
          timestamp: new Date(),
        });
      }
    }

    const completedAt = new Date();
    const status = errors.length === 0 ? 'success' : 
                   errors.length < businesses.length ? 'partial' : 'failed';

    const result: NightlyJobResult = {
      jobId,
      startedAt,
      completedAt,
      status,
      businessesProcessed: businesses.length - errors.length,
      businessesFailed: errors.length,
      snapshotsCreated,
      alertsGenerated,
      errors,
      summary,
    };

    // Store job result
    await this.storeJobResult(result);

    // Send admin summary
    await this.sendAdminSummary(result);

    return result;
  }

  /**
   * Get admin summary for dashboard
   */
  async getAdminSummary(): Promise<AdminSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get compliance breakdown
    const breakdownQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_fully_compliant = true) as compliant,
        COUNT(*) FILTER (WHERE is_fully_compliant = false AND risk_level IN ('low', 'medium')) as at_risk,
        COUNT(*) FILTER (WHERE is_fully_compliant = false AND risk_level IN ('high', 'critical')) as non_compliant
      FROM (
        SELECT DISTINCT ON (business_id) *
        FROM compliance_snapshots
        ORDER BY business_id, snapshot_date DESC
      ) latest_snapshots
    `;
    const breakdownResult = await db.query<{
      compliant: string;
      at_risk: string;
      non_compliant: string;
    }>(breakdownQuery, []);

    // Get new alerts today
    const alertsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'high') as high,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium,
        COUNT(*) FILTER (WHERE severity = 'low') as low
      FROM compliance_alerts
      WHERE created_at >= $1
    `;
    const alertsResult = await db.query<{
      critical: string;
      high: string;
      medium: string;
      low: string;
    }>(alertsQuery, [today]);

    // Get businesses requiring attention
    const attentionQuery = `
      SELECT 
        b.id as business_id,
        b.name as business_name,
        ca.title as issue,
        ca.severity
      FROM compliance_alerts ca
      JOIN businesses b ON b.id = ca.business_id
      WHERE ca.status = 'active'
        AND ca.severity IN ('critical', 'high')
      ORDER BY 
        CASE ca.severity WHEN 'critical' THEN 1 ELSE 2 END,
        ca.created_at DESC
      LIMIT 10
    `;
    const attentionResult = await db.query<{
      business_id: string;
      business_name: string;
      issue: string;
      severity: RiskLevel;
    }>(attentionQuery, []);

    // Get total businesses
    const totalQuery = `SELECT COUNT(*) as total FROM businesses WHERE is_active = true`;
    const totalResult = await db.query<{ total: string }>(totalQuery, []);

    // Identify trending issues
    const trendingIssues = await this.identifyTrendingIssues();

    return {
      date: new Date(),
      totalBusinesses: parseInt(totalResult.rows[0]?.total ?? '0', 10),
      complianceBreakdown: {
        compliant: parseInt(breakdownResult.rows[0]?.compliant ?? '0', 10),
        atRisk: parseInt(breakdownResult.rows[0]?.at_risk ?? '0', 10),
        nonCompliant: parseInt(breakdownResult.rows[0]?.non_compliant ?? '0', 10),
      },
      newAlerts: {
        critical: parseInt(alertsResult.rows[0]?.critical ?? '0', 10),
        high: parseInt(alertsResult.rows[0]?.high ?? '0', 10),
        medium: parseInt(alertsResult.rows[0]?.medium ?? '0', 10),
        low: parseInt(alertsResult.rows[0]?.low ?? '0', 10),
      },
      trendingIssues,
      businessesRequiringAttention: attentionResult.rows.map((row) => ({
        businessId: row.business_id,
        businessName: row.business_name,
        issue: row.issue,
        severity: row.severity,
      })),
    };
  }

  /**
   * Calculate statistics for a number array
   */
  private calculateStatistics(values: number[]): {
    average: number;
    minimum: number;
    maximum: number;
    standardDeviation: number;
  } {
    if (values.length === 0) {
      return { average: 0, minimum: 0, maximum: 0, standardDeviation: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);

    const squareDiffs = values.map((value) => Math.pow(value - average, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    const standardDeviation = Math.sqrt(avgSquareDiff);

    return {
      average: Math.round(average * 100) / 100,
      minimum: Math.round(minimum * 100) / 100,
      maximum: Math.round(maximum * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
    };
  }

  /**
   * Calculate linear regression trend
   */
  private calculateTrend(
    dataPoints: { date: Date; value: number }[]
  ): { direction: TrendDirection; slope: number; rSquared: number } {
    if (dataPoints.length < 2) {
      return { direction: 'stable', slope: 0, rSquared: 0 };
    }

    const n = dataPoints.length;
    
    // Convert dates to numeric x values (days from first date)
    const firstDate = dataPoints[0].date.getTime();
    const points = dataPoints.map((dp) => ({
      x: (dp.date.getTime() - firstDate) / (1000 * 60 * 60 * 24),
      y: dp.value,
    }));

    // Calculate sums for linear regression
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    points.forEach((p) => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
      sumYY += p.y * p.y;
    });

    // Calculate slope
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const ssResidual = points.reduce((sum, p) => {
      const predicted = meanY + slope * (p.x - sumX / n);
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    // Determine direction based on slope
    let direction: TrendDirection;
    if (slope > 0.05) {
      direction = 'increasing';
    } else if (slope < -0.05) {
      direction = 'declining';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      slope: Math.round(slope * 1000) / 1000,
      rSquared: Math.round(rSquared * 100) / 100,
    };
  }

  /**
   * Predict future value based on slope
   */
  private predictValue(slope: number, days: number, currentValue: number): number {
    const predicted = currentValue + slope * days;
    return Math.round(Math.max(0, Math.min(100, predicted)) * 100) / 100;
  }

  /**
   * Calculate days until reaching threshold
   */
  private calculateDaysUntilThreshold(
    currentValue: number,
    slope: number,
    threshold: number
  ): number | null {
    if (slope >= 0) {
      return null; // Not declining, won't reach threshold
    }

    if (currentValue <= threshold) {
      return 0; // Already below threshold
    }

    const days = (threshold - currentValue) / slope;
    return Math.ceil(days);
  }

  /**
   * Get risk trend from snapshots
   */
  private getRiskTrend(snapshots: ComplianceSnapshot[]): TrendDirection {
    if (snapshots.length < 2) return 'stable';

    const riskLevelToNumber: Record<RiskLevel, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const trend = this.calculateTrend(
      snapshots.map((s) => ({
        date: s.snapshotDate,
        value: riskLevelToNumber[s.riskLevel],
      }))
    );

    // Inverse because higher risk number = worse
    if (trend.direction === 'increasing') return 'declining';
    if (trend.direction === 'declining') return 'increasing';
    return 'stable';
  }

  /**
   * Generate trend-based alerts
   */
  private generateTrendAlerts(
    compliance: ComplianceStatus,
    residencyTrend: { direction: TrendDirection; slope: number },
    predicted30Days: number,
    daysUntilNonCompliant: number | null
  ): TrendAlert[] {
    const alerts: TrendAlert[] = [];

    // Declining residency alert
    if (residencyTrend.direction === 'declining') {
      alerts.push({
        type: 'declining_residency',
        severity: residencyTrend.slope < -0.2 ? 'high' : 'medium',
        message: `Residency percentage is declining at ${Math.abs(residencyTrend.slope).toFixed(2)}% per day`,
      });
    }

    // Approaching threshold alert
    if (daysUntilNonCompliant !== null && daysUntilNonCompliant > 0 && daysUntilNonCompliant <= 90) {
      const severity: RiskLevel = daysUntilNonCompliant <= 30 ? 'critical' : 'high';
      alerts.push({
        type: 'approaching_threshold',
        severity,
        message: `At current rate, residency will fall below 35% in approximately ${daysUntilNonCompliant} days`,
        predictedDate: new Date(Date.now() + daysUntilNonCompliant * 24 * 60 * 60 * 1000),
      });
    }

    // Predicted below threshold
    if (predicted30Days < 35 && compliance.residency.percentage >= 35) {
      alerts.push({
        type: 'approaching_threshold',
        severity: 'high',
        message: `Residency predicted to be ${predicted30Days.toFixed(1)}% in 30 days (below 35% threshold)`,
        predictedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Certification expiring
    if (compliance.certification.daysUntilExpiration !== null && 
        compliance.certification.daysUntilExpiration <= 90) {
      const severity: RiskLevel = compliance.certification.daysUntilExpiration <= 30 ? 'critical' : 'high';
      alerts.push({
        type: 'certification_expiring',
        severity,
        message: `Certification expires in ${compliance.certification.daysUntilExpiration} days`,
        predictedDate: compliance.certification.expirationDate ?? undefined,
      });
    }

    return alerts;
  }

  /**
   * Generate trend-based recommendations
   */
  private generateTrendRecommendations(
    compliance: ComplianceStatus,
    residencyTrend: { direction: TrendDirection; slope: number },
    employeeTrend: { direction: TrendDirection }
  ): string[] {
    const recommendations: string[] = [];

    if (residencyTrend.direction === 'declining') {
      recommendations.push('Implement a HUBZone-focused hiring strategy');
      recommendations.push('Review recent terminations for HUBZone resident employees');
      recommendations.push('Verify current employee addresses to ensure accurate residency data');
    }

    if (employeeTrend.direction === 'declining') {
      recommendations.push('Address employee retention to maintain workforce stability');
    }

    if (compliance.residency.percentage < 40) {
      recommendations.push('Consider employee referral bonuses for HUBZone residents');
      recommendations.push('Partner with workforce development in HUBZone areas');
    }

    if (!compliance.principalOffice.isCompliant || compliance.principalOffice.isRedesignated) {
      recommendations.push('Begin evaluating alternative office locations in active HUBZones');
    }

    return recommendations;
  }

  /**
   * Get report date range based on period
   */
  private getReportDateRange(
    period: ReportPeriod,
    customStart?: Date,
    customEnd?: Date
  ): { startDate: Date; endDate: Date } {
    const endDate = customEnd ?? new Date();
    let startDate: Date;

    switch (period) {
      case 'weekly':
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'annual':
        startDate = new Date(endDate);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        startDate = customStart ?? new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    currentStatus: ComplianceStatus,
    historicalData: ComplianceSnapshot[],
    trendAnalysis: TrendAnalysis
  ): ExecutiveSummary {
    const overallStatus = currentStatus.isFullyCompliant ? 'compliant' :
                          currentStatus.riskAssessment.riskLevel === 'critical' ? 'non_compliant' : 'at_risk';

    const keyFindings: string[] = [];
    const criticalIssues: string[] = [];
    const improvements: string[] = [];

    // Analyze residency
    if (!currentStatus.residency.isCompliant) {
      criticalIssues.push(`HUBZone residency at ${currentStatus.residency.percentage.toFixed(1)}%, below required 35%`);
    } else if (currentStatus.residency.buffer < 5) {
      keyFindings.push(`Limited residency buffer: ${currentStatus.residency.buffer.toFixed(1)}% above threshold`);
    }

    // Analyze trends
    if (trendAnalysis.residency.trend === 'increasing') {
      improvements.push(`Residency has been improving over the past ${trendAnalysis.periodDays} days`);
    } else if (trendAnalysis.residency.trend === 'declining') {
      keyFindings.push('Residency percentage shows declining trend');
    }

    // Principal office
    if (!currentStatus.principalOffice.isCompliant) {
      criticalIssues.push('Principal office not in HUBZone');
    } else if (currentStatus.principalOffice.isRedesignated) {
      keyFindings.push(`Principal office in redesignated HUBZone (${currentStatus.principalOffice.gracePeriodDaysRemaining} days remaining)`);
    }

    // Certification
    if (currentStatus.certification.isExpired) {
      criticalIssues.push('HUBZone certification has expired');
    } else if (currentStatus.certification.isExpiringSoon) {
      keyFindings.push(`Certification expires in ${currentStatus.certification.daysUntilExpiration} days`);
    }

    // Calculate score change
    const oldSnapshots = historicalData.slice(0, Math.ceil(historicalData.length / 2));
    const oldScore = oldSnapshots.length > 0 
      ? oldSnapshots.reduce((sum, s) => sum + (100 - s.riskScore * 5), 0) / oldSnapshots.length
      : this.calculateComplianceScore(currentStatus);
    const currentScore = this.calculateComplianceScore(currentStatus);
    const scoreChange = currentScore - oldScore;

    // Determine risk level change
    let riskLevelChange: 'improved' | 'unchanged' | 'worsened' = 'unchanged';
    if (trendAnalysis.riskLevel.trend === 'increasing') {
      riskLevelChange = 'improved';
    } else if (trendAnalysis.riskLevel.trend === 'declining') {
      riskLevelChange = 'worsened';
    }

    return {
      overallStatus,
      keyFindings,
      criticalIssues,
      improvements,
      complianceScore: currentScore,
      complianceScoreChange: Math.round(scoreChange * 10) / 10,
      riskLevel: currentStatus.riskAssessment.riskLevel,
      riskLevelChange,
    };
  }

  /**
   * Generate charts for report
   */
  private generateReportCharts(
    historicalData: ComplianceSnapshot[],
    trendAnalysis: TrendAnalysis
  ): ReportChart[] {
    const charts: ReportChart[] = [];

    // Residency over time chart
    charts.push({
      id: 'residency-trend',
      type: 'line',
      title: 'HUBZone Residency Percentage Over Time',
      description: 'Historical residency percentage with compliance threshold',
      data: historicalData.map((snapshot) => ({
        label: snapshot.snapshotDate.toLocaleDateString(),
        value: snapshot.residencyPercentage,
        date: snapshot.snapshotDate,
      })),
      config: {
        xAxisLabel: 'Date',
        yAxisLabel: 'Residency %',
        showLegend: true,
        showGrid: true,
        thresholdLines: [
          { value: 35, label: 'Minimum Threshold (35%)', color: '#dc2626' },
        ],
        colors: ['#3b82f6'],
      },
    });

    // Employee count chart
    charts.push({
      id: 'employee-count',
      type: 'area',
      title: 'Employee Count Over Time',
      description: 'Total employees and HUBZone residents',
      data: historicalData.flatMap((snapshot) => [
        {
          label: snapshot.snapshotDate.toLocaleDateString(),
          value: snapshot.totalEmployees,
          date: snapshot.snapshotDate,
          category: 'Total Employees',
        },
        {
          label: snapshot.snapshotDate.toLocaleDateString(),
          value: snapshot.hubzoneResidents,
          date: snapshot.snapshotDate,
          category: 'HUBZone Residents',
        },
      ]),
      config: {
        xAxisLabel: 'Date',
        yAxisLabel: 'Count',
        showLegend: true,
        showGrid: true,
        colors: ['#6366f1', '#10b981'],
      },
    });

    // Risk score chart
    charts.push({
      id: 'risk-score',
      type: 'line',
      title: 'Risk Score Over Time',
      description: 'Compliance risk score trend',
      data: historicalData.map((snapshot) => ({
        label: snapshot.snapshotDate.toLocaleDateString(),
        value: snapshot.riskScore,
        date: snapshot.snapshotDate,
      })),
      config: {
        xAxisLabel: 'Date',
        yAxisLabel: 'Risk Score',
        showLegend: false,
        showGrid: true,
        thresholdLines: [
          { value: 4, label: 'Medium Risk', color: '#f59e0b' },
          { value: 7, label: 'High Risk', color: '#f97316' },
          { value: 10, label: 'Critical Risk', color: '#dc2626' },
        ],
        colors: ['#8b5cf6'],
      },
    });

    // Compliance status pie chart
    const compliantCount = historicalData.filter((s) => s.isFullyCompliant).length;
    const nonCompliantCount = historicalData.length - compliantCount;
    charts.push({
      id: 'compliance-status',
      type: 'pie',
      title: 'Compliance Status Distribution',
      description: 'Proportion of compliant vs non-compliant snapshots',
      data: [
        { label: 'Compliant', value: compliantCount, color: '#10b981' },
        { label: 'Non-Compliant', value: nonCompliantCount, color: '#ef4444' },
      ],
      config: {
        showLegend: true,
        showGrid: false,
      },
    });

    return charts;
  }

  /**
   * Generate report recommendations
   */
  private generateReportRecommendations(
    currentStatus: ComplianceStatus,
    trendAnalysis: TrendAnalysis
  ): ReportRecommendation[] {
    const recommendations: ReportRecommendation[] = [];

    // Critical: Non-compliant residency
    if (!currentStatus.residency.isCompliant) {
      recommendations.push({
        priority: 'critical',
        category: 'Residency',
        title: 'Restore HUBZone Residency Compliance',
        description: `Current residency is ${currentStatus.residency.percentage.toFixed(1)}%, below the required 35%. Hire ${currentStatus.residency.shortfall} HUBZone residents immediately.`,
        impact: 'Failure to comply will result in loss of HUBZone certification',
        estimatedEffort: '2-4 weeks',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    // High: Declining trend
    if (trendAnalysis.residency.trend === 'declining' && currentStatus.residency.isCompliant) {
      recommendations.push({
        priority: 'high',
        category: 'Residency',
        title: 'Address Declining Residency Trend',
        description: 'Residency percentage is declining. Implement retention strategies and prioritize HUBZone hiring.',
        impact: 'Continued decline may lead to non-compliance',
        estimatedEffort: 'Ongoing',
      });
    }

    // Medium: Low buffer
    if (currentStatus.residency.buffer > 0 && currentStatus.residency.buffer < 5) {
      recommendations.push({
        priority: 'medium',
        category: 'Residency',
        title: 'Increase Residency Buffer',
        description: 'Current buffer of only ' + currentStatus.residency.buffer.toFixed(1) + '% leaves little margin for error.',
        impact: 'Any employee changes could impact compliance',
        estimatedEffort: 'Ongoing hiring focus',
      });
    }

    // Principal office recommendations
    if (currentStatus.principalOffice.isRedesignated) {
      const daysRemaining = currentStatus.principalOffice.gracePeriodDaysRemaining ?? 0;
      recommendations.push({
        priority: daysRemaining < 180 ? 'high' : 'medium',
        category: 'Principal Office',
        title: 'Plan Office Relocation',
        description: `Principal office is in a redesignated HUBZone with ${daysRemaining} days remaining in grace period.`,
        impact: 'Must relocate before grace period ends to maintain compliance',
        estimatedEffort: '3-6 months',
        deadline: currentStatus.principalOffice.gracePeriodEndDate ?? undefined,
      });
    }

    // Certification recommendations
    if (currentStatus.certification.isExpiringSoon) {
      const days = currentStatus.certification.daysUntilExpiration ?? 0;
      recommendations.push({
        priority: days < 30 ? 'critical' : 'high',
        category: 'Certification',
        title: 'Renew HUBZone Certification',
        description: `Certification expires in ${days} days. Begin recertification process.`,
        impact: 'Expired certification means loss of HUBZone program benefits',
        estimatedEffort: '2-4 weeks',
        deadline: currentStatus.certification.expirationDate ?? undefined,
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall compliance score (0-100)
   */
  private calculateComplianceScore(status: ComplianceStatus): number {
    let score = 100;

    // Residency component (40 points)
    if (!status.residency.isCompliant) {
      score -= 40;
    } else {
      // Reduce score based on how close to threshold
      const buffer = status.residency.buffer;
      if (buffer < 2) score -= 15;
      else if (buffer < 5) score -= 10;
      else if (buffer < 10) score -= 5;
    }

    // Principal office component (25 points)
    if (!status.principalOffice.isCompliant) {
      score -= 25;
    } else if (status.principalOffice.isRedesignated) {
      const days = status.principalOffice.gracePeriodDaysRemaining ?? 0;
      if (days < 180) score -= 15;
      else if (days < 365) score -= 10;
      else score -= 5;
    }

    // Certification component (20 points)
    if (status.certification.isExpired) {
      score -= 20;
    } else if (status.certification.isExpiringSoon) {
      const days = status.certification.daysUntilExpiration ?? 0;
      if (days < 30) score -= 15;
      else if (days < 60) score -= 10;
      else score -= 5;
    }

    // Ownership component (15 points)
    if (!status.ownership.isCompliant) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Identify trending issues across all businesses
   */
  private async identifyTrendingIssues(): Promise<string[]> {
    const issues: string[] = [];

    // Check for widespread residency issues
    const residencyQuery = `
      SELECT COUNT(*) as count
      FROM (
        SELECT DISTINCT ON (business_id) *
        FROM compliance_snapshots
        ORDER BY business_id, snapshot_date DESC
      ) latest
      WHERE residency_percentage < 40
    `;
    const residencyResult = await db.query<{ count: string }>(residencyQuery, []);
    const lowResidencyCount = parseInt(residencyResult.rows[0]?.count ?? '0', 10);
    if (lowResidencyCount > 5) {
      issues.push(`${lowResidencyCount} businesses have low residency buffers`);
    }

    // Check for certification expirations
    const certQuery = `
      SELECT COUNT(*) as count
      FROM certifications
      WHERE status = 'approved'
        AND expiration_date <= NOW() + INTERVAL '90 days'
    `;
    const certResult = await db.query<{ count: string }>(certQuery, []);
    const expiringCerts = parseInt(certResult.rows[0]?.count ?? '0', 10);
    if (expiringCerts > 0) {
      issues.push(`${expiringCerts} certifications expiring within 90 days`);
    }

    // Check for principal office issues
    const officeQuery = `
      SELECT COUNT(*) as count
      FROM (
        SELECT DISTINCT ON (business_id) *
        FROM compliance_snapshots
        ORDER BY business_id, snapshot_date DESC
      ) latest
      WHERE is_principal_office_compliant = false
    `;
    const officeResult = await db.query<{ count: string }>(officeQuery, []);
    const officeIssues = parseInt(officeResult.rows[0]?.count ?? '0', 10);
    if (officeIssues > 0) {
      issues.push(`${officeIssues} businesses have principal office compliance issues`);
    }

    return issues;
  }

  /**
   * Store report record in database
   */
  private async storeReportRecord(report: ComplianceReport): Promise<void> {
    const query = `
      INSERT INTO compliance_reports (
        id, business_id, generated_at, generated_by, period,
        start_date, end_date, compliance_score, format, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    await db.query(query, [
      report.id,
      report.businessId,
      report.generatedAt,
      report.generatedBy,
      report.period,
      report.startDate,
      report.endDate,
      report.complianceScore,
      report.format,
      JSON.stringify({
        executiveSummary: report.executiveSummary,
        recommendationsCount: report.recommendations.length,
      }),
    ]);
  }

  /**
   * Store nightly job result
   */
  private async storeJobResult(result: NightlyJobResult): Promise<void> {
    const query = `
      INSERT INTO nightly_job_results (
        job_id, started_at, completed_at, status,
        businesses_processed, businesses_failed,
        snapshots_created, alerts_generated,
        errors, summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    await db.query(query, [
      result.jobId,
      result.startedAt,
      result.completedAt,
      result.status,
      result.businessesProcessed,
      result.businessesFailed,
      result.snapshotsCreated,
      result.alertsGenerated,
      JSON.stringify(result.errors),
      JSON.stringify(result.summary),
    ]);
  }

  /**
   * Send admin summary notification
   */
  private async sendAdminSummary(jobResult: NightlyJobResult): Promise<void> {
    // Get admin users
    const adminQuery = `
      SELECT id, email, first_name, last_name
      FROM users
      WHERE role = 'admin' AND is_active = true
    `;
    const adminResult = await db.query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    }>(adminQuery, []);

    // In production, send email to each admin
    for (const admin of adminResult.rows) {
      console.info(`[AdminSummary] Would send nightly summary to ${admin.email}`);
      console.info(`  - Processed: ${jobResult.businessesProcessed} businesses`);
      console.info(`  - Compliant: ${jobResult.summary.compliantBusinesses}`);
      console.info(`  - At Risk: ${jobResult.summary.atRiskBusinesses}`);
      console.info(`  - Non-Compliant: ${jobResult.summary.nonCompliantBusinesses}`);
      console.info(`  - Critical Alerts: ${jobResult.summary.criticalAlerts}`);
    }
  }

  /**
   * Map database row to ComplianceSnapshot
   */
  private mapSnapshotRow(row: Record<string, unknown>): ComplianceSnapshot {
    return {
      id: row['id'] as string,
      businessId: row['business_id'] as string,
      snapshotDate: new Date(row['snapshot_date'] as string),
      totalEmployees: row['total_employees'] as number,
      hubzoneResidents: row['hubzone_residents'] as number,
      residencyPercentage: row['residency_percentage'] as number,
      isResidencyCompliant: row['is_residency_compliant'] as boolean,
      isPrincipalOfficeCompliant: row['is_principal_office_compliant'] as boolean,
      isCertificationValid: row['is_certification_valid'] as boolean,
      isOwnershipCompliant: row['is_ownership_compliant'] as boolean,
      isFullyCompliant: row['is_fully_compliant'] as boolean,
      riskLevel: row['risk_level'] as RiskLevel,
      riskScore: row['risk_score'] as number,
      certificationDaysRemaining: row['certification_days_remaining'] as number | null,
      gracePeriodDaysRemaining: row['grace_period_days_remaining'] as number | null,
      ownershipPercentage: row['ownership_percentage'] as number,
      metadata: typeof row['metadata'] === 'string'
        ? JSON.parse(row['metadata'] as string)
        : (row['metadata'] as SnapshotMetadata ?? { triggerType: 'manual' }),
      createdAt: new Date(row['created_at'] as string),
    };
  }
}

// Export singleton instance
export const complianceHistoryService = new ComplianceHistoryService();

