import { apiClient } from './api';
import type { ApiResponse, PaginatedResponse } from '../types';
import type {
  ContractorSearchResult,
  ContractorVerification,
  BulkVerificationResult,
  VerificationHistoryRecord,
  VerificationReport,
  ContractorSearchParams,
  VerificationHistoryFilters,
} from '../types/agency';

/**
 * Agency verification API service
 */
export const agencyService = {
  /**
   * Search for contractors by name, UEI, or CAGE code
   */
  async searchContractors(params: ContractorSearchParams): Promise<ApiResponse<ContractorSearchResult[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.legalName) searchParams.append('legalName', params.legalName);
    if (params.ueiNumber) searchParams.append('ueiNumber', params.ueiNumber);
    if (params.cageCode) searchParams.append('cageCode', params.cageCode);
    
    return apiClient.get<ApiResponse<ContractorSearchResult[]>>(
      `/agency/contractors/search?${searchParams.toString()}`
    );
  },

  /**
   * Verify a single contractor by UEI number
   */
  async verifyContractor(ueiNumber: string): Promise<ApiResponse<ContractorVerification>> {
    return apiClient.get<ApiResponse<ContractorVerification>>(
      `/agency/verify/${encodeURIComponent(ueiNumber)}`
    );
  },

  /**
   * Bulk verify multiple contractors
   */
  async bulkVerifyContractors(ueiNumbers: string[]): Promise<ApiResponse<BulkVerificationResult>> {
    return apiClient.post<ApiResponse<BulkVerificationResult>>(
      '/agency/verify/bulk',
      { ueiNumbers }
    );
  },

  /**
   * Get verification history
   */
  async getVerificationHistory(
    filters?: VerificationHistoryFilters
  ): Promise<PaginatedResponse<VerificationHistoryRecord>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.riskLevel) params.append('riskLevel', filters.riskLevel);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    return apiClient.get<PaginatedResponse<VerificationHistoryRecord>>(
      `/agency/verifications/history?${params.toString()}`
    );
  },

  /**
   * Generate verification report data for PDF
   */
  async generateVerificationReport(businessId: string): Promise<ApiResponse<VerificationReport>> {
    return apiClient.get<ApiResponse<VerificationReport>>(
      `/agency/report/${encodeURIComponent(businessId)}`
    );
  },

  /**
   * Parse CSV file to extract UEI numbers
   */
  parseCSVForUEIs(csvContent: string): string[] {
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) return [];
    
    const firstLine = lines[0];
    if (!firstLine) return [];
    
    // Check if first line is header
    const hasHeader = firstLine.toLowerCase().includes('uei') || firstLine.toLowerCase().includes('number');
    
    const startIndex = hasHeader ? 1 : 0;
    const ueiNumbers: string[] = [];
    
    // Try to find UEI column index from header
    let ueiColumnIndex = 0;
    if (hasHeader) {
      const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
      const ueiIndex = headers.findIndex(h => 
        h.includes('uei') || h === 'uei_number' || h === 'ueinumber'
      );
      if (ueiIndex !== -1) ueiColumnIndex = ueiIndex;
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      const uei = columns[ueiColumnIndex];
      
      // Validate UEI format (12 alphanumeric characters)
      if (uei && /^[A-Z0-9]{12}$/i.test(uei)) {
        ueiNumbers.push(uei.toUpperCase());
      }
    }
    
    return [...new Set(ueiNumbers)]; // Remove duplicates
  },

  /**
   * Generate CSV export of verification results
   */
  generateResultsCSV(results: BulkVerificationResult): string {
    const headers = [
      'UEI Number',
      'Business Name',
      'Status',
      'Compliant',
      'Risk Level',
      'Error',
    ];
    
    const rows = results.results.map(item => [
      item.ueiNumber,
      item.businessName ?? '',
      item.status,
      item.isCompliant ? 'Yes' : 'No',
      item.riskLevel ?? '',
      item.errorMessage ?? '',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    return csvContent;
  },

  /**
   * Download CSV file
   */
  downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Get CSV template for bulk verification
   */
  getBulkVerificationTemplate(): string {
    return 'uei_number\nABC123456789\nDEF987654321';
  },
};

export default agencyService;

