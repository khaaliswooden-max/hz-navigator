import axios from 'axios';
import type {
  AgencyMetrics,
  ContractorStats,
  GeographicDistribution,
  ContractorDirectoryEntry,
  ContractorDirectoryFilters,
  ReportConfig,
  GeneratedReport,
  AnalyticsDashboard,
  DateRange,
  ReportTypeInfo,
  ReportType,
  ExportFormat,
} from '../types/analytics';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/**
 * Analytics Service
 * 
 * Frontend API client for analytics and reporting
 */
export const analyticsService = {
  /**
   * Get agency metrics
   */
  async getAgencyMetrics(
    agencyId: string,
    dateRange?: DateRange
  ): Promise<AgencyMetrics> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) {
      params.append('startDate', toISOString(dateRange.startDate));
    }
    if (dateRange?.endDate) {
      params.append('endDate', toISOString(dateRange.endDate));
    }
    
    const response = await axios.get<{ success: boolean; data: AgencyMetrics }>(
      `${API_BASE}/analytics/metrics/${agencyId}?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Get full analytics dashboard
   */
  async getAnalyticsDashboard(
    agencyId: string,
    dateRange?: DateRange
  ): Promise<AnalyticsDashboard> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) {
      params.append('startDate', toISOString(dateRange.startDate));
    }
    if (dateRange?.endDate) {
      params.append('endDate', toISOString(dateRange.endDate));
    }
    
    const response = await axios.get<{ success: boolean; data: AnalyticsDashboard }>(
      `${API_BASE}/analytics/dashboard/${agencyId}?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Get contractor directory
   */
  async getContractorDirectory(
    filters: ContractorDirectoryFilters
  ): Promise<{ contractors: ContractorDirectoryEntry[]; total: number; pagination: { page: number; limit: number; totalPages: number } }> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.state) params.append('state', filters.state);
    if (filters.naicsCode) params.append('naicsCode', filters.naicsCode);
    if (filters.certificationStatus) params.append('certificationStatus', filters.certificationStatus);
    if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const response = await axios.get<{
      success: boolean;
      data: ContractorDirectoryEntry[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`${API_BASE}/analytics/contractors?${params.toString()}`);
    
    return {
      contractors: response.data.data,
      total: response.data.pagination.total,
      pagination: response.data.pagination,
    };
  },

  /**
   * Export contractor directory
   */
  async exportContractorDirectory(
    agencyId: string,
    format: 'csv' | 'excel' = 'csv'
  ): Promise<Blob> {
    const response = await axios.get(
      `${API_BASE}/analytics/contractors/export?agencyId=${agencyId}&format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Get contractor statistics
   */
  async getContractorStats(
    agencyId: string,
    dateRange?: DateRange
  ): Promise<ContractorStats> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) {
      params.append('startDate', toISOString(dateRange.startDate));
    }
    if (dateRange?.endDate) {
      params.append('endDate', toISOString(dateRange.endDate));
    }
    
    const response = await axios.get<{ success: boolean; data: ContractorStats }>(
      `${API_BASE}/analytics/contractor-stats/${agencyId}?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Get geographic distribution
   */
  async getGeographicDistribution(
    agencyId: string,
    dateRange?: DateRange
  ): Promise<GeographicDistribution> {
    const params = new URLSearchParams();
    if (dateRange?.startDate) {
      params.append('startDate', toISOString(dateRange.startDate));
    }
    if (dateRange?.endDate) {
      params.append('endDate', toISOString(dateRange.endDate));
    }
    
    const response = await axios.get<{ success: boolean; data: GeographicDistribution }>(
      `${API_BASE}/analytics/geographic/${agencyId}?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Get available report types
   */
  async getReportTypes(): Promise<ReportTypeInfo[]> {
    const response = await axios.get<{ success: boolean; data: ReportTypeInfo[] }>(
      `${API_BASE}/analytics/reports/types`
    );
    return response.data.data;
  },

  /**
   * Generate a report
   */
  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    const payload = {
      ...config,
      startDate: toISOString(config.dateRange.startDate),
      endDate: toISOString(config.dateRange.endDate),
    };
    
    const response = await axios.post<{ success: boolean; data: GeneratedReport }>(
      `${API_BASE}/analytics/reports/generate`,
      payload
    );
    return response.data.data;
  },
};

/**
 * Convert Date or string to ISO string
 */
function toISOString(date: Date | string): string {
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get date range presets
 */
export function getDateRangePresets(): { label: string; range: DateRange }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Fiscal year starts October 1
  const fiscalYearStart = currentMonth >= 9
    ? new Date(currentYear, 9, 1)
    : new Date(currentYear - 1, 9, 1);
  const fiscalYearEnd = currentMonth >= 9
    ? new Date(currentYear + 1, 8, 30)
    : new Date(currentYear, 8, 30);
  
  return [
    {
      label: 'Current Fiscal Year',
      range: { startDate: fiscalYearStart, endDate: now },
    },
    {
      label: 'Previous Fiscal Year',
      range: {
        startDate: new Date(fiscalYearStart.getFullYear() - 1, 9, 1),
        endDate: new Date(fiscalYearStart.getFullYear(), 8, 30),
      },
    },
    {
      label: 'Last 12 Months',
      range: {
        startDate: new Date(currentYear - 1, currentMonth, 1),
        endDate: now,
      },
    },
    {
      label: 'Last 6 Months',
      range: {
        startDate: new Date(currentYear, currentMonth - 6, 1),
        endDate: now,
      },
    },
    {
      label: 'Last Quarter',
      range: {
        startDate: new Date(currentYear, Math.floor(currentMonth / 3) * 3 - 3, 1),
        endDate: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 0),
      },
    },
    {
      label: 'Year to Date',
      range: {
        startDate: new Date(currentYear, 0, 1),
        endDate: now,
      },
    },
  ];
}

/**
 * Generate report as downloadable file
 */
export async function downloadReport(
  report: GeneratedReport,
  format: ExportFormat
): Promise<void> {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'json':
      content = JSON.stringify(report, null, 2);
      mimeType = 'application/json';
      extension = 'json';
      break;
    case 'csv':
      content = convertReportToCSV(report);
      mimeType = 'text/csv';
      extension = 'csv';
      break;
    default:
      // For PDF and Excel, generate a structured text version
      content = generateReportDocument(report);
      mimeType = format === 'pdf' ? 'text/plain' : 'text/plain';
      extension = format === 'pdf' ? 'txt' : 'txt';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert report to CSV format
 */
function convertReportToCSV(report: GeneratedReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`"${report.title}"`);
  lines.push(`"Generated: ${new Date(report.generatedAt).toLocaleString()}"`);
  lines.push(`"Agency: ${report.agencyName}"`);
  lines.push('');

  // Data varies by report type
  const data = report.data;
  
  if ('contractors' in data && Array.isArray(data.contractors)) {
    lines.push('"Business Name","UEI Number","State","City","Status","Compliance Score","Risk Level","Contract Count","Contract Value"');
    for (const c of data.contractors) {
      lines.push(
        `"${c.businessName}","${c.ueiNumber}","${c.state}","${c.city}","${c.certificationStatus}",${c.complianceScore},"${c.riskLevel}",${c.contractCount},${c.totalContractValue}`
      );
    }
  } else if ('contracts' in data && Array.isArray(data.contracts)) {
    lines.push('"Contract Number","Title","Contractor","UEI","HUBZone","Award Date","Value","Type"');
    for (const c of data.contracts) {
      lines.push(
        `"${c.contractNumber}","${c.title}","${c.contractorName}","${c.contractorUei}",${c.isHubzone},"${c.awardDate}",${c.awardValue},"${c.contractType}"`
      );
    }
  } else if ('verifications' in data && Array.isArray(data.verifications)) {
    lines.push('"Business Name","UEI Number","Verified At","Status","Compliance Score","Risk Level"');
    for (const v of data.verifications) {
      lines.push(
        `"${v.businessName}","${v.ueiNumber}","${v.verifiedAt}","${v.status}",${v.complianceScore},"${v.riskLevel}"`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Generate report document content
 */
function generateReportDocument(report: GeneratedReport): string {
  const lines: string[] = [];
  const divider = '═'.repeat(60);
  
  lines.push(divider);
  lines.push(report.title.toUpperCase());
  lines.push(divider);
  lines.push('');
  lines.push(`Agency: ${report.agencyName}`);
  lines.push(`Report ID: ${report.reportId}`);
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push(`Period: ${formatDateRange(report.dateRange)}`);
  lines.push('');
  lines.push(divider);
  lines.push('EXECUTIVE SUMMARY');
  lines.push(divider);
  lines.push('');

  const data = report.data;

  if ('metrics' in data) {
    const metrics = data.metrics;
    lines.push(`Active HUBZone Businesses: ${metrics.activeHubzoneBusinesses.toLocaleString()}`);
    lines.push(`New Certifications This Year: ${metrics.newCertificationsThisYear}`);
    lines.push(`Total Contracts Awarded: ${metrics.totalContractsAwarded}`);
    lines.push(`HUBZone Contracts Awarded: ${metrics.hubzoneContractsAwarded}`);
    lines.push(`Total Contract Value: ${formatCurrency(metrics.totalContractValue)}`);
    lines.push(`HUBZone Contract Value: ${formatCurrency(metrics.hubzoneContractValue)}`);
    lines.push(`Goal Percentage: ${metrics.currentGoalPercentage}%`);
    lines.push(`Achieved Percentage: ${metrics.currentAchievedPercentage}%`);
    lines.push(`Goal Status: ${metrics.goalStatus.toUpperCase()}`);
  }

  if ('totalCount' in data) {
    lines.push(`Total Contractors: ${data.totalCount.toLocaleString()}`);
  }

  if ('totalContracts' in data) {
    lines.push(`Total Contracts: ${data.totalContracts.toLocaleString()}`);
    lines.push(`Total Value: ${formatCurrency(data.totalValue)}`);
    lines.push(`HUBZone Contracts: ${data.hubzoneContracts}`);
    lines.push(`HUBZone Value: ${formatCurrency(data.hubzoneValue)}`);
  }

  if ('totalVerifications' in data) {
    lines.push(`Total Verifications: ${data.totalVerifications}`);
    lines.push(`Compliant: ${data.summary.compliant}`);
    lines.push(`Non-Compliant: ${data.summary.nonCompliant}`);
    lines.push(`Expired: ${data.summary.expired}`);
  }

  if ('recommendations' in data && data.recommendations.length > 0) {
    lines.push('');
    lines.push(divider);
    lines.push('RECOMMENDATIONS');
    lines.push(divider);
    data.recommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. ${rec}`);
    });
  }

  lines.push('');
  lines.push(divider);
  lines.push('END OF REPORT');
  lines.push(divider);
  lines.push('');
  lines.push('This report was generated for congressional reporting requirements');
  lines.push('in accordance with the HUBZone program guidelines.');

  return lines.join('\n');
}

/**
 * Format date range for display
 */
function formatDateRange(range: DateRange): string {
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * Get default agency ID (placeholder for auth integration)
 */
export function getDefaultAgencyId(): string {
  return 'default-agency';
}

