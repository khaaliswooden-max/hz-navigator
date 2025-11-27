import { apiClient } from './api';
import type { Owner, OwnerFormData, OwnershipSummary } from '../types/ownership';
import type { ApiResponse } from '../types';

/**
 * Ownership API service
 */
export const ownershipService = {
  /**
   * Get owners for a business
   */
  async getOwners(businessId: string): Promise<ApiResponse<Owner[]>> {
    return apiClient.get<ApiResponse<Owner[]>>(`/businesses/${businessId}/owners`);
  },

  /**
   * Get single owner
   */
  async getOwner(businessId: string, ownerId: string): Promise<ApiResponse<Owner>> {
    return apiClient.get<ApiResponse<Owner>>(`/businesses/${businessId}/owners/${ownerId}`);
  },

  /**
   * Create new owner
   */
  async createOwner(businessId: string, data: OwnerFormData): Promise<ApiResponse<Owner>> {
    return apiClient.post<ApiResponse<Owner>>(`/businesses/${businessId}/owners`, data);
  },

  /**
   * Update owner
   */
  async updateOwner(businessId: string, ownerId: string, data: Partial<OwnerFormData>): Promise<ApiResponse<Owner>> {
    return apiClient.put<ApiResponse<Owner>>(`/businesses/${businessId}/owners/${ownerId}`, data);
  },

  /**
   * Delete owner
   */
  async deleteOwner(businessId: string, ownerId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/businesses/${businessId}/owners/${ownerId}`);
  },

  /**
   * Get ownership summary
   */
  async getOwnershipSummary(businessId: string): Promise<ApiResponse<OwnershipSummary>> {
    return apiClient.get<ApiResponse<OwnershipSummary>>(`/businesses/${businessId}/ownership-summary`);
  },

  /**
   * Validate ownership changes
   */
  async validateOwnership(
    businessId: string, 
    owners: { id?: string; ownershipPercentage: number; isUsCitizen: boolean }[]
  ): Promise<ApiResponse<{
    valid: boolean;
    totalPercentage: number;
    usCitizenPercentage: number;
    errors: string[];
  }>> {
    return apiClient.post<ApiResponse<{
      valid: boolean;
      totalPercentage: number;
      usCitizenPercentage: number;
      errors: string[];
    }>>(`/businesses/${businessId}/validate-ownership`, { owners });
  },
};

export default ownershipService;

