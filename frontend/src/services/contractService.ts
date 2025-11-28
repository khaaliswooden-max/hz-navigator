import { apiClient } from './api';
import type { ApiResponse, PaginatedResponse } from '../types';
import type {
  Contract,
  CreateContractData,
  FiscalYearGoal,
  GoalProgress,
  ContractSummary,
  TopContractor,
  FiscalYearReport,
  ContractFilters,
} from '../types/contract';

/**
 * Contract API service
 */
export const contractService = {
  /**
   * Get contracts with filters
   */
  async getContracts(filters?: ContractFilters): Promise<PaginatedResponse<Contract>> {
    const params = new URLSearchParams();
    
    if (filters?.agencyId) params.append('agencyId', filters.agencyId);
    if (filters?.fiscalYear) params.append('fiscalYear', String(filters.fiscalYear));
    if (filters?.fiscalQuarter) params.append('fiscalQuarter', String(filters.fiscalQuarter));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.contractType) params.append('contractType', filters.contractType);
    if (filters?.isHubzoneContractor !== undefined) {
      params.append('isHubzoneContractor', String(filters.isHubzoneContractor));
    }
    if (filters?.contractorUei) params.append('contractorUei', filters.contractorUei);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.minValue) params.append('minValue', String(filters.minValue));
    if (filters?.maxValue) params.append('maxValue', String(filters.maxValue));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    return apiClient.get<PaginatedResponse<Contract>>(
      `/contracts?${params.toString()}`
    );
  },

  /**
   * Get single contract by ID
   */
  async getContract(id: string): Promise<ApiResponse<Contract>> {
    return apiClient.get<ApiResponse<Contract>>(`/contracts/${id}`);
  },

  /**
   * Create new contract
   */
  async createContract(data: CreateContractData, agencyId: string): Promise<ApiResponse<Contract>> {
    return apiClient.post<ApiResponse<Contract>>('/contracts', {
      ...data,
      agencyId,
    });
  },

  /**
   * Update contract
   */
  async updateContract(
    id: string,
    updates: Partial<Pick<Contract, 'title' | 'description' | 'currentValue' | 'obligatedAmount' | 'status' | 'periodOfPerformanceEnd'>>
  ): Promise<ApiResponse<Contract>> {
    return apiClient.put<ApiResponse<Contract>>(`/contracts/${id}`, updates);
  },

  /**
   * Delete contract
   */
  async deleteContract(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/contracts/${id}`);
  },

  /**
   * Get fiscal year goal
   */
  async getFiscalYearGoal(
    agencyId: string,
    fiscalYear: number
  ): Promise<ApiResponse<FiscalYearGoal | null>> {
    return apiClient.get<ApiResponse<FiscalYearGoal | null>>(
      `/contracts/goals/${fiscalYear}?agencyId=${agencyId}`
    );
  },

  /**
   * Set fiscal year goal
   */
  async setFiscalYearGoal(
    agencyId: string,
    fiscalYear: number,
    goalPercentage: number,
    totalContractingGoal: number,
    notes?: string
  ): Promise<ApiResponse<FiscalYearGoal>> {
    return apiClient.post<ApiResponse<FiscalYearGoal>>(
      `/contracts/goals/${fiscalYear}`,
      { agencyId, goalPercentage, totalContractingGoal, notes }
    );
  },

  /**
   * Get goal progress
   */
  async getGoalProgress(
    agencyId: string,
    fiscalYear: number
  ): Promise<ApiResponse<GoalProgress>> {
    return apiClient.get<ApiResponse<GoalProgress>>(
      `/contracts/progress/${fiscalYear}?agencyId=${agencyId}`
    );
  },

  /**
   * Get contract summary
   */
  async getContractSummary(
    agencyId: string,
    fiscalYear: number
  ): Promise<ApiResponse<ContractSummary>> {
    return apiClient.get<ApiResponse<ContractSummary>>(
      `/contracts/summary/${fiscalYear}?agencyId=${agencyId}`
    );
  },

  /**
   * Get top HUBZone contractors
   */
  async getTopContractors(
    agencyId: string,
    fiscalYear: number,
    limit?: number
  ): Promise<ApiResponse<TopContractor[]>> {
    const params = new URLSearchParams({ agencyId });
    if (limit) params.append('limit', String(limit));
    
    return apiClient.get<ApiResponse<TopContractor[]>>(
      `/contracts/top-contractors/${fiscalYear}?${params.toString()}`
    );
  },

  /**
   * Generate fiscal year report
   */
  async generateFiscalYearReport(
    agencyId: string,
    fiscalYear: number
  ): Promise<ApiResponse<FiscalYearReport>> {
    return apiClient.get<ApiResponse<FiscalYearReport>>(
      `/contracts/report/${fiscalYear}?agencyId=${agencyId}`
    );
  },

  /**
   * Export contracts for FPDS-NG
   */
  async exportForFPDS(agencyId: string, fiscalYear: number): Promise<Blob> {
    const response = await fetch(
      `/api/contracts/export/fpds/${fiscalYear}?agencyId=${agencyId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );
    return response.blob();
  },

  /**
   * Download FPDS export
   */
  downloadFPDSExport(blob: Blob, fiscalYear: number): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fpds_export_fy${fiscalYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Get current fiscal year
   */
  getCurrentFiscalYear(): number {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return month >= 10 ? year + 1 : year;
  },

  /**
   * Get fiscal year options for selector
   */
  getFiscalYearOptions(): { value: number; label: string }[] {
    const currentFY = this.getCurrentFiscalYear();
    const options = [];
    
    for (let i = currentFY + 1; i >= currentFY - 4; i--) {
      options.push({ value: i, label: `FY ${i}` });
    }
    
    return options;
  },

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  /**
   * Format compact currency (e.g., $1.5M)
   */
  formatCompactCurrency(value: number): string {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  },
};

export default contractService;

