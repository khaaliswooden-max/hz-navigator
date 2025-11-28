/**
 * Analytics and Reporting Types
 * 
 * Types for agency analytics, metrics, and report generation
 */

import type { RiskLevel } from './compliance';

/**
 * Report types available for generation
 */
export type ReportType = 
  | 'hubzone_goal_achievement'
  | 'contractor_directory'
  | 'verification_history'
  | 'contract_awards_summary'
  | 'geographic_distribution';

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

/**
 * Date range for reports
 */
export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}

/**
 * Report type metadata
 */
export interface ReportTypeInfo {
  id: ReportType;
  name: string;
  description: string;
  category: string;
  formats: ExportFormat[];
}

/**
 * Agency metrics summary
 */
export interface AgencyMetrics {
  agencyId: string;
  agencyName: string;
  dateRange: DateRange;
  generatedAt: Date | string;
  
  // Business metrics
  activeHubzoneBusinesses: number;
  totalCertifiedBusinesses: number;
  newCertificationsThisYear: number;
  certificationsPendingReview: number;
  expiringCertifications30Days: number;
  
  // Contract metrics
  totalContractsAwarded: number;
  hubzoneContractsAwarded: number;
  totalContractValue: number;
  hubzoneContractValue: number;
  averageContractValue: number;
  averageHubzoneContractValue: number;
  
  // Verification metrics
  verificationsPerformed: number;
  compliantVerifications: number;
  nonCompliantVerifications: number;
  
  // Goal metrics
  currentGoalPercentage: number;
  currentAchievedPercentage: number;
  goalStatus: 'on_track' | 'at_risk' | 'behind';
}

/**
 * Contractor statistics
 */
export interface ContractorStats {
  totalContractors: number;
  byState: StateContractorCount[];
  byNaics: NaicsContractorCount[];
  byCertificationStatus: CertificationStatusCount[];
  byRiskLevel: RiskLevelCount[];
  topContractors: TopContractorStat[];
}

/**
 * State contractor count
 */
export interface StateContractorCount {
  state: string;
  stateName: string;
  count: number;
  percentage: number;
  totalContractValue: number;
}

/**
 * NAICS contractor count
 */
export interface NaicsContractorCount {
  code: string;
  title: string;
  count: number;
  percentage: number;
}

/**
 * Certification status count
 */
export interface CertificationStatusCount {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

/**
 * Risk level count
 */
export interface RiskLevelCount {
  level: RiskLevel;
  count: number;
  percentage: number;
}

/**
 * Top contractor statistics
 */
export interface TopContractorStat {
  businessId: string;
  businessName: string;
  ueiNumber: string;
  state: string;
  contractCount: number;
  totalValue: number;
  certificationStatus: string;
  riskLevel: RiskLevel;
}

/**
 * Geographic distribution data
 */
export interface GeographicDistribution {
  byState: StateDistribution[];
  byRegion: RegionDistribution[];
  concentrationAreas: ConcentrationArea[];
  underservedAreas: string[];
}

/**
 * State distribution
 */
export interface StateDistribution {
  state: string;
  stateName: string;
  businessCount: number;
  contractCount: number;
  contractValue: number;
  hubzoneTracts: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Region distribution
 */
export interface RegionDistribution {
  region: string;
  states: string[];
  businessCount: number;
  contractCount: number;
  contractValue: number;
  percentageOfTotal: number;
}

/**
 * Concentration area
 */
export interface ConcentrationArea {
  name: string;
  type: 'metro' | 'state' | 'region';
  businessCount: number;
  contractValue: number;
}

/**
 * Contractor directory entry
 */
export interface ContractorDirectoryEntry {
  businessId: string;
  businessName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  
  // Location
  state: string;
  city: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Classification
  naicsCodes: {
    code: string;
    title: string;
    isPrimary: boolean;
  }[];
  
  // Certification
  certificationStatus: string;
  certificationDate?: Date | string;
  expirationDate?: Date | string;
  
  // Compliance
  complianceScore: number;
  riskLevel: RiskLevel;
  
  // Contracts
  contractCount: number;
  totalContractValue: number;
  lastAwardDate?: Date | string;
}

/**
 * Contractor directory filters
 */
export interface ContractorDirectoryFilters {
  search?: string;
  state?: string;
  naicsCode?: string;
  certificationStatus?: string;
  riskLevel?: RiskLevel;
  minContractValue?: number;
  maxContractValue?: number;
  hasActiveContracts?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'businessName' | 'state' | 'certificationDate' | 'contractValue' | 'riskLevel';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Report configuration
 */
export interface ReportConfig {
  reportType: ReportType;
  agencyId: string;
  dateRange: DateRange;
  format: ExportFormat;
  filters?: Record<string, unknown>;
  includeCharts?: boolean;
  includeSummary?: boolean;
}

/**
 * Generated report
 */
export interface GeneratedReport {
  reportId: string;
  reportType: ReportType;
  title: string;
  description: string;
  agencyId: string;
  agencyName: string;
  generatedAt: Date | string;
  generatedBy?: string;
  dateRange: DateRange;
  format: ExportFormat;
  
  // Report content based on type
  data: ReportData;
  
  // Metadata
  pageCount?: number;
  fileSize?: number;
  downloadUrl?: string;
}

/**
 * Report data union type
 */
export type ReportData = 
  | GoalAchievementReportData
  | ContractorDirectoryReportData
  | VerificationHistoryReportData
  | ContractAwardsReportData
  | GeographicDistributionReportData;

/**
 * Goal achievement report data
 */
export interface GoalAchievementReportData {
  type: 'hubzone_goal_achievement';
  metrics: AgencyMetrics;
  monthlyProgress: {
    month: string;
    targetPercentage: number;
    actualPercentage: number;
    contractsAwarded: number;
    contractValue: number;
  }[];
  quarterlyComparison: {
    quarter: string;
    hubzoneValue: number;
    totalValue: number;
    percentage: number;
  }[];
  yearOverYearComparison: {
    fiscalYear: number;
    percentage: number;
    change: number;
  }[];
  recommendations: string[];
}

/**
 * Contractor directory report data
 */
export interface ContractorDirectoryReportData {
  type: 'contractor_directory';
  totalCount: number;
  contractors: ContractorDirectoryEntry[];
  summary: {
    byState: StateContractorCount[];
    byNaics: NaicsContractorCount[];
    byCertificationStatus: CertificationStatusCount[];
  };
}

/**
 * Verification history report data
 */
export interface VerificationHistoryReportData {
  type: 'verification_history';
  totalVerifications: number;
  verifications: {
    id: string;
    businessName: string;
    ueiNumber: string;
    verifiedAt: Date | string;
    status: string;
    complianceScore: number;
    riskLevel: RiskLevel;
    verifiedBy?: string;
  }[];
  summary: {
    compliant: number;
    nonCompliant: number;
    expired: number;
    notFound: number;
  };
  byMonth: {
    month: string;
    count: number;
    compliantCount: number;
  }[];
}

/**
 * Contract awards report data
 */
export interface ContractAwardsReportData {
  type: 'contract_awards_summary';
  totalContracts: number;
  totalValue: number;
  hubzoneContracts: number;
  hubzoneValue: number;
  contracts: {
    contractNumber: string;
    title: string;
    contractorName: string;
    contractorUei: string;
    isHubzone: boolean;
    awardDate: Date | string;
    awardValue: number;
    contractType: string;
  }[];
  byContractType: {
    type: string;
    label: string;
    count: number;
    value: number;
  }[];
  byQuarter: {
    quarter: string;
    contracts: number;
    value: number;
    hubzoneContracts: number;
    hubzoneValue: number;
  }[];
  topContractors: TopContractorStat[];
}

/**
 * Geographic distribution report data
 */
export interface GeographicDistributionReportData {
  type: 'geographic_distribution';
  distribution: GeographicDistribution;
  heatmapData: {
    state: string;
    value: number;
    type: 'businesses' | 'contracts' | 'value';
  }[];
  insights: {
    title: string;
    description: string;
    metric: string;
  }[];
}

/**
 * Chart data for analytics
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  date?: Date | string;
}

/**
 * Time series data
 */
export interface TimeSeriesData {
  label: string;
  data: {
    date: Date | string;
    value: number;
  }[];
}

/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboard {
  agencyId: string;
  agencyName: string;
  generatedAt: Date | string;
  dateRange: DateRange;
  
  // Key metrics
  metrics: AgencyMetrics;
  
  // Charts data
  contractsOverTime: TimeSeriesData[];
  goalAchievementTrend: ChartDataPoint[];
  geographicHeatmap: StateDistribution[];
  naicsDistribution: ChartDataPoint[];
  contractTypeBreakdown: ChartDataPoint[];
  
  // Top lists
  topStates: StateContractorCount[];
  topContractors: TopContractorStat[];
  topNaicsCodes: NaicsContractorCount[];
}

/**
 * Display labels for report types
 */
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  hubzone_goal_achievement: 'HUBZone Goal Achievement',
  contractor_directory: 'Contractor Directory',
  verification_history: 'Verification History',
  contract_awards_summary: 'Contract Awards Summary',
  geographic_distribution: 'Geographic Distribution',
};

/**
 * Display labels for export formats
 */
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF Document',
  excel: 'Excel Spreadsheet',
  csv: 'CSV File',
  json: 'JSON Data',
};

/**
 * Goal status colors
 */
export const GOAL_STATUS_COLORS: Record<AgencyMetrics['goalStatus'], string> = {
  on_track: '#10b981', // green
  at_risk: '#f59e0b', // amber
  behind: '#ef4444', // red
};

/**
 * US States list
 */
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

