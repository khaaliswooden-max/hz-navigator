import { apiClient } from './api';
import type {
  Professional,
  ProfessionalListItem,
  ProfessionalFilters,
  ProfessionalFormData,
  ResidencyVerificationResult,
  VerificationCertificate,
  ApiResponse,
  PaginatedResponse,
} from '../types/professional';

/**
 * Professional Service - API calls for professional profiles
 */
class ProfessionalService {
  private baseUrl = '/professionals';

  /**
   * Get the current user's professional profile
   */
  async getMyProfile(): Promise<ApiResponse<Professional>> {
    try {
      const data = await apiClient.get<Professional>(`${this.baseUrl}/me`);
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch profile',
        },
      };
    }
  }

  /**
   * Get a professional profile by ID (public view for businesses)
   */
  async getProfile(id: string): Promise<ApiResponse<Professional>> {
    try {
      const data = await apiClient.get<Professional>(`${this.baseUrl}/${id}`);
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch profile',
        },
      };
    }
  }

  /**
   * Update the current user's professional profile
   */
  async updateProfile(data: ProfessionalFormData): Promise<ApiResponse<Professional>> {
    try {
      const response = await apiClient.put<Professional>(`${this.baseUrl}/me`, data);
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: err.response?.data?.message || 'Failed to update profile',
          details: err.response?.data?.errors,
        },
      };
    }
  }

  /**
   * Search professionals (for businesses)
   */
  async searchProfessionals(
    filters: ProfessionalFilters
  ): Promise<ApiResponse<PaginatedResponse<ProfessionalListItem>>> {
    try {
      const params = new URLSearchParams();
      
      if (filters.search) params.set('search', filters.search);
      if (filters.verificationStatus) params.set('verificationStatus', filters.verificationStatus);
      if (filters.skills?.length) params.set('skills', filters.skills.join(','));
      if (filters.location?.state) params.set('state', filters.location.state);
      if (filters.location?.city) params.set('city', filters.location.city);
      if (filters.location?.zipCode) params.set('zipCode', filters.location.zipCode);
      if (filters.location?.radius) params.set('radius', filters.location.radius.toString());
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());

      const data = await apiClient.get<PaginatedResponse<ProfessionalListItem>>(
        `${this.baseUrl}?${params.toString()}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: err.response?.data?.message || 'Failed to search professionals',
        },
      };
    }
  }

  /**
   * Verify residency in HUBZone
   */
  async verifyResidency(): Promise<ApiResponse<ResidencyVerificationResult>> {
    try {
      const data = await apiClient.post<ResidencyVerificationResult>(
        `${this.baseUrl}/me/verify-residency`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: err.response?.data?.message || 'Failed to verify residency',
        },
      };
    }
  }

  /**
   * Get verification certificate
   */
  async getVerificationCertificate(): Promise<ApiResponse<VerificationCertificate>> {
    try {
      const data = await apiClient.get<VerificationCertificate>(
        `${this.baseUrl}/me/certificate`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'CERTIFICATE_ERROR',
          message: err.response?.data?.message || 'Failed to get certificate',
        },
      };
    }
  }

  /**
   * Download verification certificate as PDF
   */
  async downloadCertificatePDF(): Promise<Blob> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}${this.baseUrl}/me/certificate/pdf`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download certificate');
    }

    return response.blob();
  }

  /**
   * Upload resume
   */
  async uploadResume(file: File): Promise<ApiResponse<{ resumeUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}${this.baseUrl}/me/resume`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload resume');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'Failed to upload resume',
        },
      };
    }
  }

  /**
   * Delete resume
   */
  async deleteResume(): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`${this.baseUrl}/me/resume`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: err.response?.data?.message || 'Failed to delete resume',
        },
      };
    }
  }
}

const professionalService = new ProfessionalService();
export default professionalService;

