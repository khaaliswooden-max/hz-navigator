import { apiClient } from './api';
import type { BusinessProfile, BusinessListItem, BusinessFilters, BusinessFormData } from '../types/business';
import type { PaginatedResponse, ApiResponse } from '../types';

/**
 * Business API service
 */
export const businessService = {
  /**
   * Get list of businesses (admin)
   */
  async getBusinesses(filters?: BusinessFilters): Promise<PaginatedResponse<BusinessListItem>> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.state) params.append('state', filters.state);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.certificationDateFrom) params.append('certificationDateFrom', filters.certificationDateFrom);
    if (filters?.certificationDateTo) params.append('certificationDateTo', filters.certificationDateTo);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    return apiClient.get<PaginatedResponse<BusinessListItem>>(
      `/businesses?${params.toString()}`
    );
  },

  /**
   * Get single business profile
   */
  async getBusiness(id: string): Promise<ApiResponse<BusinessProfile>> {
    return apiClient.get<ApiResponse<BusinessProfile>>(`/businesses/${id}`);
  },

  /**
   * Get current user's business profile
   */
  async getMyBusiness(): Promise<ApiResponse<BusinessProfile>> {
    return apiClient.get<ApiResponse<BusinessProfile>>('/businesses/me');
  },

  /**
   * Create new business
   */
  async createBusiness(data: BusinessFormData): Promise<ApiResponse<BusinessProfile>> {
    return apiClient.post<ApiResponse<BusinessProfile>>('/businesses', data);
  },

  /**
   * Update business profile
   */
  async updateBusiness(id: string, data: Partial<BusinessFormData>): Promise<ApiResponse<BusinessProfile>> {
    return apiClient.put<ApiResponse<BusinessProfile>>(`/businesses/${id}`, data);
  },

  /**
   * Delete business
   */
  async deleteBusiness(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/businesses/${id}`);
  },

  /**
   * Search NAICS codes
   */
  async searchNAICS(query: string): Promise<{ code: string; title: string }[]> {
    return apiClient.get<{ code: string; title: string }[]>(
      `/naics/search?q=${encodeURIComponent(query)}`
    );
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
    return apiClient.get(
      `/geocode/autocomplete?q=${encodeURIComponent(query)}`
    );
  },
};

export default businessService;

