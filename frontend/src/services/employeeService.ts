import { apiClient } from './api';
import type { 
  Employee, 
  EmployeeListItem, 
  EmployeeFilters, 
  EmployeeFormData,
  EmployeeComplianceMetrics,
  BulkImportResult,
  AddressChange 
} from '../types/employee';
import type { PaginatedResponse, ApiResponse, Address } from '../types';

/**
 * Employee API service
 */
export const employeeService = {
  /**
   * Get list of employees
   */
  async getEmployees(filters?: EmployeeFilters): Promise<PaginatedResponse<EmployeeListItem>> {
    const params = new URLSearchParams();
    
    if (filters?.hubzoneStatus) params.append('hubzoneStatus', filters.hubzoneStatus);
    if (filters?.employmentStatus) params.append('employmentStatus', filters.employmentStatus);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    return apiClient.get<PaginatedResponse<EmployeeListItem>>(
      `/employees?${params.toString()}`
    );
  },

  /**
   * Get single employee
   */
  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return apiClient.get<ApiResponse<Employee>>(`/employees/${id}`);
  },

  /**
   * Create new employee
   */
  async createEmployee(data: EmployeeFormData): Promise<ApiResponse<Employee>> {
    return apiClient.post<ApiResponse<Employee>>('/employees', data);
  },

  /**
   * Update employee
   */
  async updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<ApiResponse<Employee>> {
    return apiClient.put<ApiResponse<Employee>>(`/employees/${id}`, data);
  },

  /**
   * Update employee address
   */
  async updateEmployeeAddress(id: string, address: Address, effectiveDate: string): Promise<ApiResponse<Employee>> {
    return apiClient.post<ApiResponse<Employee>>(`/employees/${id}/address`, { 
      address, 
      effectiveDate 
    });
  },

  /**
   * Terminate employee
   */
  async terminateEmployee(id: string, terminationDate: string, notes?: string): Promise<ApiResponse<Employee>> {
    return apiClient.post<ApiResponse<Employee>>(`/employees/${id}/terminate`, {
      terminationDate,
      notes,
    });
  },

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/employees/${id}`);
  },

  /**
   * Get employee address history
   */
  async getAddressHistory(employeeId: string): Promise<ApiResponse<AddressChange[]>> {
    return apiClient.get<ApiResponse<AddressChange[]>>(`/employees/${employeeId}/address-history`);
  },

  /**
   * Get compliance metrics
   */
  async getComplianceMetrics(): Promise<ApiResponse<EmployeeComplianceMetrics>> {
    return apiClient.get<ApiResponse<EmployeeComplianceMetrics>>('/employees/compliance-metrics');
  },

  /**
   * Calculate compliance impact of adding/removing employee
   */
  async calculateComplianceImpact(
    action: 'add' | 'remove',
    hubzoneStatus: 'resident' | 'non_resident'
  ): Promise<ApiResponse<{
    currentMetrics: EmployeeComplianceMetrics;
    projectedMetrics: EmployeeComplianceMetrics;
    impact: 'positive' | 'negative' | 'neutral';
    message: string;
  }>> {
    return apiClient.post<ApiResponse<{
      currentMetrics: EmployeeComplianceMetrics;
      projectedMetrics: EmployeeComplianceMetrics;
      impact: 'positive' | 'negative' | 'neutral';
      message: string;
    }>>('/employees/compliance-impact', { action, hubzoneStatus });
  },

  /**
   * Verify HUBZone status for address
   */
  async verifyHubzoneStatus(address: Address): Promise<ApiResponse<{
    isHubzone: boolean;
    hubzoneType?: string;
    designationDate?: string;
    expirationDate?: string;
  }>> {
    return apiClient.post<ApiResponse<{
      isHubzone: boolean;
      hubzoneType?: string;
      designationDate?: string;
      expirationDate?: string;
    }>>('/hubzone/verify-address', address);
  },

  /**
   * Bulk import employees from CSV
   */
  async bulkImport(file: File): Promise<ApiResponse<BulkImportResult>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post<ApiResponse<BulkImportResult>>('/employees/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get CSV import template
   */
  async getImportTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>('/employees/import-template', {
      responseType: 'blob',
    });
    return response;
  },

  /**
   * Autocomplete address
   */
  async autocompleteAddress(query: string): Promise<{
    street1: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: { latitude: number; longitude: number };
  }[]> {
    return apiClient.get(`/geocode/autocomplete?q=${encodeURIComponent(query)}`);
  },
};

export default employeeService;

