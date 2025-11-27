import { apiClient } from './api';

export type ReportType = 
  | 'current_compliance'
  | 'historical_compliance'
  | 'employee_residency'
  | 'certification_audit'
  | 'annual_summary';

export type ExportFormat = 'pdf' | 'csv' | 'excel';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportConfig {
  id?: string;
  name: string;
  type: ReportType;
  dateRange?: DateRange;
  includeCharts: boolean;
  includeRecommendations: boolean;
  createdAt?: string;
}

export interface ScheduledReport {
  id: string;
  config: ReportConfig;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  nextRun: string;
  recipients: string[];
  enabled: boolean;
}

export interface ReportMetrics {
  overallCompliance: number;
  employeeResidency: {
    percentage: number;
    target: number;
    hubzoneCount: number;
    totalCount: number;
  };
  ownership: {
    usCitizenPercentage: number;
    target: number;
  };
  certification: {
    status: string;
    expirationDate: string;
    daysRemaining: number;
  };
  principalOffice: {
    verified: boolean;
    address: string;
    lastVerified: string;
  };
}

export interface ReportFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation?: string;
}

export interface ReportHistoryItem {
  date: string;
  employeeResidency: number;
  overallCompliance: number;
  hubzoneEmployees: number;
  totalEmployees: number;
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  dateRange?: DateRange;
  businessName: string;
  businessId: string;
  metrics: ReportMetrics;
  findings: ReportFinding[];
  recommendations: string[];
  history?: ReportHistoryItem[];
  executiveSummary: string;
}

export interface ReportHistoryEntry {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  generatedBy: string;
  downloadUrl?: string;
}

// Report type metadata
export const reportTypes: Record<ReportType, { 
  label: string; 
  description: string; 
  icon: string;
  requiresDateRange: boolean;
}> = {
  current_compliance: {
    label: 'Current Compliance Status',
    description: 'Snapshot of your current HUBZone compliance metrics and status',
    icon: 'shield',
    requiresDateRange: false,
  },
  historical_compliance: {
    label: 'Historical Compliance',
    description: 'Compliance trends and changes over a specified time period',
    icon: 'chart',
    requiresDateRange: true,
  },
  employee_residency: {
    label: 'Employee Residency Report',
    description: 'Detailed breakdown of employee HUBZone residency status',
    icon: 'users',
    requiresDateRange: false,
  },
  certification_audit: {
    label: 'Certification Audit Report',
    description: 'Complete audit trail for SBA certification requirements',
    icon: 'clipboard',
    requiresDateRange: false,
  },
  annual_summary: {
    label: 'Annual Compliance Summary',
    description: 'Year-end summary of compliance activities and status',
    icon: 'calendar',
    requiresDateRange: true,
  },
};

// Mock data generators
function generateMockMetrics(): ReportMetrics {
  return {
    overallCompliance: 87,
    employeeResidency: {
      percentage: 42.3,
      target: 35,
      hubzoneCount: 22,
      totalCount: 52,
    },
    ownership: {
      usCitizenPercentage: 75,
      target: 51,
    },
    certification: {
      status: 'Active',
      expirationDate: '2025-01-12',
      daysRemaining: 45,
    },
    principalOffice: {
      verified: true,
      address: '1234 Innovation Way, Baltimore, MD 21201',
      lastVerified: '2024-10-15',
    },
  };
}

function generateMockFindings(type: ReportType): ReportFinding[] {
  const baseFindings: ReportFinding[] = [
    {
      id: '1',
      severity: 'info',
      title: 'Employee Residency Exceeds Minimum',
      description: 'Current HUBZone employee residency (42.3%) exceeds the 35% minimum requirement by 7.3 percentage points.',
      recommendation: 'Maintain current hiring practices to preserve compliance buffer.',
    },
    {
      id: '2',
      severity: 'medium',
      title: 'Certification Renewal Due Soon',
      description: 'HUBZone certification expires in 45 days. Renewal process should be initiated.',
      recommendation: 'Begin certification renewal process within the next 2 weeks.',
    },
    {
      id: '3',
      severity: 'low',
      title: 'Address Verification Pending',
      description: '3 employees have addresses that have not been reverified in the past 12 months.',
      recommendation: 'Schedule address verification for affected employees.',
    },
  ];

  if (type === 'employee_residency') {
    return [
      ...baseFindings,
      {
        id: '4',
        severity: 'info',
        title: 'New Hire Impact Analysis',
        description: 'Recent hiring of 2 HUBZone residents has increased compliance percentage by 1.2%.',
      },
    ];
  }

  if (type === 'certification_audit') {
    return [
      ...baseFindings,
      {
        id: '4',
        severity: 'info',
        title: 'Audit Documentation Complete',
        description: 'All required documentation for SBA audit is present and up-to-date.',
      },
      {
        id: '5',
        severity: 'low',
        title: 'Principal Office Verification',
        description: 'Principal office has been verified and meets all HUBZone location requirements.',
      },
    ];
  }

  return baseFindings;
}

function generateMockHistory(dateRange?: DateRange): ReportHistoryItem[] {
  const history: ReportHistoryItem[] = [];
  const endDate = dateRange ? new Date(dateRange.endDate) : new Date();
  const startDate = dateRange 
    ? new Date(dateRange.startDate) 
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  let baseResidency = 40;
  
  for (let i = 0; i <= days; i += Math.max(1, Math.floor(days / 30))) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    baseResidency += (Math.random() - 0.5) * 2;
    baseResidency = Math.max(35, Math.min(50, baseResidency));
    
    const totalEmployees = 52;
    const hubzoneEmployees = Math.round(totalEmployees * (baseResidency / 100));
    
    history.push({
      date: date.toISOString().split('T')[0],
      employeeResidency: Math.round(baseResidency * 10) / 10,
      overallCompliance: Math.round((baseResidency / 35) * 85 * 10) / 10,
      hubzoneEmployees,
      totalEmployees,
    });
  }
  
  return history;
}

function getExecutiveSummary(type: ReportType, metrics: ReportMetrics): string {
  const summaries: Record<ReportType, string> = {
    current_compliance: `This report provides a comprehensive overview of the current HUBZone compliance status for your business. As of the report date, your overall compliance score stands at ${metrics.overallCompliance}%, indicating ${metrics.overallCompliance >= 85 ? 'strong' : metrics.overallCompliance >= 70 ? 'satisfactory' : 'concerning'} adherence to HUBZone program requirements. Key metrics show employee residency at ${metrics.employeeResidency.percentage}% (${metrics.employeeResidency.percentage >= metrics.employeeResidency.target ? 'above' : 'below'} the ${metrics.employeeResidency.target}% threshold), U.S. citizen ownership at ${metrics.ownership.usCitizenPercentage}%, and principal office verification ${metrics.principalOffice.verified ? 'confirmed' : 'pending'}.`,
    
    historical_compliance: `This historical analysis tracks your HUBZone compliance metrics over the specified reporting period. The data reveals trends in employee residency percentages, overall compliance scores, and key program requirements. Understanding these trends is essential for maintaining certification and preparing for SBA examinations.`,
    
    employee_residency: `This employee residency report details the HUBZone residency status of your workforce. Currently, ${metrics.employeeResidency.hubzoneCount} out of ${metrics.employeeResidency.totalCount} employees (${metrics.employeeResidency.percentage}%) reside in qualified HUBZone areas, ${metrics.employeeResidency.percentage >= metrics.employeeResidency.target ? 'exceeding' : 'falling below'} the required ${metrics.employeeResidency.target}% threshold. This report includes verification status, address details, and recommendations for maintaining compliance.`,
    
    certification_audit: `This certification audit report has been prepared to document compliance with all HUBZone program requirements as mandated by the Small Business Administration (SBA). The report covers ownership structure, employee residency requirements, principal office location verification, and certification status. All documentation has been compiled in accordance with 13 CFR 126 regulations.`,
    
    annual_summary: `This annual compliance summary provides a comprehensive review of your HUBZone program participation over the past year. The report aggregates monthly compliance data, highlights significant events and changes, and provides an assessment of overall program adherence. This summary is suitable for internal review, stakeholder reporting, and preparation for SBA program examinations.`,
  };
  
  return summaries[type];
}

function getRecommendations(type: ReportType, metrics: ReportMetrics): string[] {
  const baseRecommendations: string[] = [];
  
  // Add context-specific recommendations
  if (metrics.employeeResidency.percentage < metrics.employeeResidency.target + 5) {
    baseRecommendations.push(
      'Consider prioritizing hiring from HUBZone areas to increase your compliance buffer above the minimum threshold.'
    );
  }
  
  if (metrics.certification.daysRemaining < 90) {
    baseRecommendations.push(
      `Begin certification renewal preparations as expiration is within ${metrics.certification.daysRemaining} days.`
    );
  }
  
  baseRecommendations.push(
    'Maintain regular address verification schedules to ensure employee residency data remains accurate.',
    'Document any ownership changes promptly to maintain compliance records.',
    'Keep principal office documentation current and readily accessible for audits.'
  );
  
  if (type === 'certification_audit') {
    baseRecommendations.push(
      'Prepare employee roster with current addresses for SBA examination.',
      'Compile ownership documentation including citizenship verification.',
      'Gather lease agreements and utility bills for principal office verification.'
    );
  }
  
  if (type === 'annual_summary') {
    baseRecommendations.push(
      'Review compliance trends to identify patterns requiring attention.',
      'Update internal compliance monitoring procedures based on annual findings.',
      'Schedule quarterly compliance reviews for the upcoming year.'
    );
  }
  
  return baseRecommendations;
}

// API Functions
export async function generateReport(
  type: ReportType, 
  dateRange?: DateRange,
  options?: { includeCharts?: boolean; includeRecommendations?: boolean }
): Promise<GeneratedReport> {
  try {
    // In production, this would call the actual API
    // const data = await apiClient.post<GeneratedReport>('/reports/generate', {
    //   type,
    //   dateRange,
    //   options,
    // });
    // return data;
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const metrics = generateMockMetrics();
    const findings = generateMockFindings(type);
    const history = (type === 'historical_compliance' || type === 'annual_summary') 
      ? generateMockHistory(dateRange) 
      : undefined;
    
    return {
      id: `report-${Date.now()}`,
      type,
      title: reportTypes[type].label,
      generatedAt: new Date().toISOString(),
      dateRange,
      businessName: 'Acme Technology Solutions, LLC',
      businessId: 'biz-123',
      metrics,
      findings,
      recommendations: getRecommendations(type, metrics),
      history,
      executiveSummary: getExecutiveSummary(type, metrics),
    };
  } catch (error) {
    console.error('Failed to generate report:', error);
    throw error;
  }
}

export async function downloadReport(
  reportId: string, 
  format: ExportFormat = 'pdf'
): Promise<Blob> {
  try {
    // In production, this would call the actual API
    // const blob = await apiClient.get<Blob>(`/reports/${reportId}/download?format=${format}`, {
    //   responseType: 'blob',
    // });
    // return blob;
    
    // Mock implementation - return a placeholder
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a simple text blob for demo
    const content = `HUBZone Compliance Report\nReport ID: ${reportId}\nFormat: ${format}\nGenerated: ${new Date().toISOString()}`;
    return new Blob([content], { type: 'text/plain' });
  } catch (error) {
    console.error('Failed to download report:', error);
    throw error;
  }
}

export async function emailReport(
  reportId: string, 
  email: string,
  format: ExportFormat = 'pdf'
): Promise<{ success: boolean; message: string }> {
  try {
    // In production, this would call the actual API
    // const result = await apiClient.post('/reports/email', {
    //   reportId,
    //   email,
    //   format,
    // });
    // return result;
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: `Report has been sent to ${email}`,
    };
  } catch (error) {
    console.error('Failed to email report:', error);
    throw error;
  }
}

export async function getReportHistory(): Promise<ReportHistoryEntry[]> {
  try {
    // In production, this would call the actual API
    // const data = await apiClient.get<ReportHistoryEntry[]>('/reports/history');
    // return data;
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: 'report-1',
        type: 'current_compliance',
        title: 'Current Compliance Status',
        generatedAt: new Date(Date.now() - 86400000).toISOString(),
        generatedBy: 'John Smith',
      },
      {
        id: 'report-2',
        type: 'employee_residency',
        title: 'Employee Residency Report',
        generatedAt: new Date(Date.now() - 172800000).toISOString(),
        generatedBy: 'John Smith',
      },
      {
        id: 'report-3',
        type: 'certification_audit',
        title: 'Certification Audit Report',
        generatedAt: new Date(Date.now() - 604800000).toISOString(),
        generatedBy: 'Jane Doe',
      },
    ];
  } catch (error) {
    console.error('Failed to fetch report history:', error);
    throw error;
  }
}

export async function saveReportConfig(config: ReportConfig): Promise<ReportConfig> {
  try {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      ...config,
      id: `config-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to save report config:', error);
    throw error;
  }
}

export async function getSavedConfigs(): Promise<ReportConfig[]> {
  try {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: 'config-1',
        name: 'Monthly Compliance Check',
        type: 'current_compliance',
        includeCharts: true,
        includeRecommendations: true,
        createdAt: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: 'config-2',
        name: 'Quarterly Employee Review',
        type: 'employee_residency',
        includeCharts: true,
        includeRecommendations: true,
        createdAt: new Date(Date.now() - 1209600000).toISOString(),
      },
    ];
  } catch (error) {
    console.error('Failed to fetch saved configs:', error);
    throw error;
  }
}

export async function scheduleReport(
  config: ReportConfig,
  frequency: ScheduledReport['frequency'],
  recipients: string[]
): Promise<ScheduledReport> {
  try {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const nextRun = new Date();
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
    }
    
    return {
      id: `schedule-${Date.now()}`,
      config,
      frequency,
      nextRun: nextRun.toISOString(),
      recipients,
      enabled: true,
    };
  } catch (error) {
    console.error('Failed to schedule report:', error);
    throw error;
  }
}

export async function getScheduledReports(): Promise<ScheduledReport[]> {
  try {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        id: 'schedule-1',
        config: {
          id: 'config-1',
          name: 'Weekly Compliance Summary',
          type: 'current_compliance',
          includeCharts: true,
          includeRecommendations: true,
        },
        frequency: 'weekly',
        nextRun: new Date(Date.now() + 604800000).toISOString(),
        recipients: ['admin@company.com'],
        enabled: true,
      },
    ];
  } catch (error) {
    console.error('Failed to fetch scheduled reports:', error);
    throw error;
  }
}

