/**
 * Compliance monitoring types for HUBZone certification
 */

import type { Address } from './hubzone.js';

/**
 * Risk levels for compliance assessment
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Trend direction for residency analysis
 */
export type TrendDirection = 'increasing' | 'stable' | 'declining';

/**
 * Principal office compliance status
 */
export interface PrincipalOfficeStatus {
  isCompliant: boolean;
  isInHubzone: boolean;
  isRedesignated: boolean;
  gracePeriodEndDate: Date | null;
  gracePeriodDaysRemaining: number | null;
  address: Address | null;
  hubzoneId: string | null;
  hubzoneName: string | null;
  issues: string[];
}

/**
 * Residency compliance status
 */
export interface ResidencyStatus {
  totalEmployees: number;
  hubzoneResidents: number;
  percentage: number;
  isCompliant: boolean;
  buffer: number; // How much above 35% threshold
  minimumRequired: number;
  shortfall: number; // Employees needed to reach compliance
}

/**
 * Certification status for compliance
 */
export interface CertificationComplianceStatus {
  certificationId: string | null;
  status: string | null;
  expirationDate: Date | null;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean; // Within 90 days
  isExpired: boolean;
}

/**
 * Ownership compliance status
 */
export interface OwnershipStatus {
  isCompliant: boolean;
  ownershipPercentage: number;
  requiredPercentage: number;
  issues: string[];
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  riskLevel: RiskLevel;
  riskScore: number;
  factors: RiskFactor[];
  trend: TrendDirection;
  recommendations: string[];
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  category: string;
  description: string;
  points: number;
  severity: RiskLevel;
}

/**
 * Historical compliance data point
 */
export interface ComplianceHistoryEntry {
  date: Date;
  residencyPercentage: number;
  totalEmployees: number;
  hubzoneResidents: number;
  riskLevel: RiskLevel;
}

/**
 * Complete compliance status for a business
 */
export interface ComplianceStatus {
  businessId: string;
  businessName: string;
  calculatedAt: Date;
  overallRiskLevel: RiskLevel;
  isFullyCompliant: boolean;
  residency: ResidencyStatus;
  principalOffice: PrincipalOfficeStatus;
  certification: CertificationComplianceStatus;
  ownership: OwnershipStatus;
  riskAssessment: RiskAssessment;
  complianceHistory: ComplianceHistoryEntry[];
  nextReviewDate: Date | null;
}

/**
 * Employee record for residency calculation
 */
export interface Employee {
  id: string;
  businessId: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  residentialAddress: Address;
  isHubzoneResident: boolean;
  hubzoneVerifiedAt: Date | null;
  hireDate: Date;
  terminationDate: Date | null;
}

/**
 * Business with extended compliance data
 */
export interface BusinessComplianceData {
  id: string;
  name: string;
  principalOfficeAddress: Address;
  certificationId: string | null;
  certificationExpirationDate: Date | null;
  certificationStatus: string | null;
  ownershipPercentage: number;
}

/**
 * Compliance monitoring configuration
 */
export interface ComplianceConfig {
  residencyThreshold: number; // Default 35%
  certificationExpirationWarningDays: number; // Default 90
  gracePeriodDays: number; // Default 1095 (3 years)
  ownershipThreshold: number; // Default 51%
}

/**
 * Default compliance configuration
 */
export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  residencyThreshold: 35,
  certificationExpirationWarningDays: 90,
  gracePeriodDays: 1095, // 3 years for redesignated areas
  ownershipThreshold: 51,
};

/**
 * Compliance snapshot - point-in-time compliance data
 */
export interface ComplianceSnapshot {
  id: string;
  businessId: string;
  snapshotDate: Date;
  totalEmployees: number;
  hubzoneResidents: number;
  residencyPercentage: number;
  isResidencyCompliant: boolean;
  isPrincipalOfficeCompliant: boolean;
  isCertificationValid: boolean;
  isOwnershipCompliant: boolean;
  isFullyCompliant: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  certificationDaysRemaining: number | null;
  gracePeriodDaysRemaining: number | null;
  ownershipPercentage: number;
  metadata: SnapshotMetadata;
  createdAt: Date;
}

/**
 * Snapshot metadata for additional context
 */
export interface SnapshotMetadata {
  triggerType: 'scheduled' | 'manual' | 'event';
  triggeredBy?: string;
  employeeChanges?: {
    hired: number;
    terminated: number;
    addressChanged: number;
  };
  notes?: string;
}

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  businessId: string;
  analyzedAt: Date;
  periodDays: number;
  dataPoints: number;
  residency: {
    current: number;
    average: number;
    minimum: number;
    maximum: number;
    trend: TrendDirection;
    slope: number;
    predictedIn30Days: number;
    predictedIn90Days: number;
    daysUntilNonCompliant: number | null;
  };
  riskLevel: {
    current: RiskLevel;
    trend: TrendDirection;
    averageScore: number;
  };
  employeeCount: {
    current: number;
    average: number;
    trend: TrendDirection;
    netChange: number;
  };
  alerts: TrendAlert[];
  recommendations: string[];
}

/**
 * Trend-based alert
 */
export interface TrendAlert {
  type: 'declining_residency' | 'approaching_threshold' | 'employee_loss' | 'certification_expiring';
  severity: RiskLevel;
  message: string;
  predictedDate?: Date;
}

/**
 * Compliance report structure
 */
export interface ComplianceReport {
  id: string;
  businessId: string;
  businessName: string;
  generatedAt: Date;
  generatedBy: string;
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  executiveSummary: ExecutiveSummary;
  currentStatus: ComplianceStatus;
  historicalData: ComplianceSnapshot[];
  trendAnalysis: TrendAnalysis;
  charts: ReportChart[];
  recommendations: ReportRecommendation[];
  complianceScore: number;
  format: 'pdf' | 'json' | 'html';
}

/**
 * Report period options
 */
export type ReportPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';

/**
 * Executive summary for report
 */
export interface ExecutiveSummary {
  overallStatus: 'compliant' | 'at_risk' | 'non_compliant';
  keyFindings: string[];
  criticalIssues: string[];
  improvements: string[];
  complianceScore: number;
  complianceScoreChange: number;
  riskLevel: RiskLevel;
  riskLevelChange: 'improved' | 'unchanged' | 'worsened';
}

/**
 * Chart data for reports
 */
export interface ReportChart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  description: string;
  data: ChartDataPoint[];
  config: ChartConfig;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: Date;
  category?: string;
  color?: string;
}

/**
 * Chart configuration
 */
export interface ChartConfig {
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  showGrid: boolean;
  thresholdLines?: { value: number; label: string; color: string }[];
  colors?: string[];
}

/**
 * Report recommendation
 */
export interface ReportRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  estimatedEffort: string;
  deadline?: Date;
}

/**
 * Nightly job result
 */
export interface NightlyJobResult {
  jobId: string;
  startedAt: Date;
  completedAt: Date;
  status: 'success' | 'partial' | 'failed';
  businessesProcessed: number;
  businessesFailed: number;
  snapshotsCreated: number;
  alertsGenerated: number;
  errors: JobError[];
  summary: {
    compliantBusinesses: number;
    atRiskBusinesses: number;
    nonCompliantBusinesses: number;
    criticalAlerts: number;
  };
}

/**
 * Job error record
 */
export interface JobError {
  businessId: string;
  businessName: string;
  error: string;
  timestamp: Date;
}

/**
 * Admin summary notification
 */
export interface AdminSummary {
  date: Date;
  totalBusinesses: number;
  complianceBreakdown: {
    compliant: number;
    atRisk: number;
    nonCompliant: number;
  };
  newAlerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  trendingIssues: string[];
  businessesRequiringAttention: {
    businessId: string;
    businessName: string;
    issue: string;
    severity: RiskLevel;
  }[];
}

