import { apiClient } from './api';
import type {
  Job,
  JobListItem,
  JobFilters,
  JobFormData,
  JobApplication,
  ApplicationFormData,
  MatchScoreBreakdown,
  ApiResponse,
  PaginatedResponse,
} from '../types/job';

/**
 * Job Service - API calls for job postings and applications
 */
class JobService {
  private baseUrl = '/jobs';

  // ============ JOB POSTING ENDPOINTS ============

  /**
   * Get all jobs with filters (public)
   */
  async getJobs(filters: JobFilters = {}): Promise<ApiResponse<PaginatedResponse<JobListItem>>> {
    try {
      const params = new URLSearchParams();

      if (filters.search) params.set('search', filters.search);
      if (filters.hubzoneOnly) params.set('hubzoneOnly', 'true');
      if (filters.employmentType?.length) params.set('employmentType', filters.employmentType.join(','));
      if (filters.salaryMin) params.set('salaryMin', filters.salaryMin.toString());
      if (filters.salaryMax) params.set('salaryMax', filters.salaryMax.toString());
      if (filters.salaryType) params.set('salaryType', filters.salaryType);
      if (filters.location?.state) params.set('state', filters.location.state);
      if (filters.location?.city) params.set('city', filters.location.city);
      if (filters.location?.zipCode) params.set('zipCode', filters.location.zipCode);
      if (filters.location?.radius) params.set('radius', filters.location.radius.toString());
      if (filters.skills?.length) params.set('skills', filters.skills.join(','));
      if (filters.isRemote !== undefined) params.set('isRemote', filters.isRemote.toString());
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
      if (filters.page) params.set('page', filters.page.toString());
      if (filters.limit) params.set('limit', filters.limit.toString());

      const data = await apiClient.get<PaginatedResponse<JobListItem>>(
        `${this.baseUrl}?${params.toString()}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch jobs',
        },
      };
    }
  }

  /**
   * Get a specific job by ID
   */
  async getJob(id: string): Promise<ApiResponse<Job>> {
    try {
      const data = await apiClient.get<Job>(`${this.baseUrl}/${id}`);
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch job',
        },
      };
    }
  }

  /**
   * Create a new job posting (business owners)
   */
  async createJob(data: JobFormData): Promise<ApiResponse<Job>> {
    try {
      const response = await apiClient.post<Job>(this.baseUrl, data);
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
      return {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: err.response?.data?.message || 'Failed to create job posting',
          details: err.response?.data?.errors,
        },
      };
    }
  }

  /**
   * Update a job posting (business owners)
   */
  async updateJob(id: string, data: Partial<JobFormData>): Promise<ApiResponse<Job>> {
    try {
      const response = await apiClient.put<Job>(`${this.baseUrl}/${id}`, data);
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: err.response?.data?.message || 'Failed to update job posting',
          details: err.response?.data?.errors,
        },
      };
    }
  }

  /**
   * Delete a job posting (business owners)
   */
  async deleteJob(id: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: err.response?.data?.message || 'Failed to delete job posting',
        },
      };
    }
  }

  /**
   * Publish a job posting (change status from draft to published)
   */
  async publishJob(id: string): Promise<ApiResponse<Job>> {
    try {
      const response = await apiClient.post<Job>(`${this.baseUrl}/${id}/publish`);
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'PUBLISH_ERROR',
          message: err.response?.data?.message || 'Failed to publish job posting',
        },
      };
    }
  }

  /**
   * Close a job posting
   */
  async closeJob(id: string): Promise<ApiResponse<Job>> {
    try {
      const response = await apiClient.post<Job>(`${this.baseUrl}/${id}/close`);
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'CLOSE_ERROR',
          message: err.response?.data?.message || 'Failed to close job posting',
        },
      };
    }
  }

  /**
   * Get jobs posted by the current business
   */
  async getMyJobs(filters?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Job>>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());

      const data = await apiClient.get<PaginatedResponse<Job>>(
        `${this.baseUrl}/my-jobs?${params.toString()}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch your jobs',
        },
      };
    }
  }

  // ============ APPLICATION ENDPOINTS ============

  /**
   * Apply for a job (professionals)
   */
  async applyForJob(jobId: string, data: ApplicationFormData): Promise<ApiResponse<JobApplication>> {
    try {
      const response = await apiClient.post<JobApplication>(
        `${this.baseUrl}/${jobId}/apply`,
        data
      );
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'APPLY_ERROR',
          message: err.response?.data?.message || 'Failed to submit application',
        },
      };
    }
  }

  /**
   * Get my applications (professionals)
   */
  async getMyApplications(filters?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<JobApplication & { job: JobListItem }>>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());

      const data = await apiClient.get<PaginatedResponse<JobApplication & { job: JobListItem }>>(
        `/applications/me?${params.toString()}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch applications',
        },
      };
    }
  }

  /**
   * Get applications for a job (business owners)
   */
  async getJobApplications(jobId: string, filters?: { status?: string; sortBy?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<JobApplication>>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);
      if (filters?.page) params.set('page', filters.page.toString());
      if (filters?.limit) params.set('limit', filters.limit.toString());

      const data = await apiClient.get<PaginatedResponse<JobApplication>>(
        `${this.baseUrl}/${jobId}/applications?${params.toString()}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch applications',
        },
      };
    }
  }

  /**
   * Update application status (business owners)
   */
  async updateApplicationStatus(
    applicationId: string,
    status: string,
    note?: string
  ): Promise<ApiResponse<JobApplication>> {
    try {
      const response = await apiClient.patch<JobApplication>(
        `/applications/${applicationId}/status`,
        { status, note }
      );
      return { success: true, data: response };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: err.response?.data?.message || 'Failed to update application status',
        },
      };
    }
  }

  /**
   * Withdraw application (professionals)
   */
  async withdrawApplication(applicationId: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post(`/applications/${applicationId}/withdraw`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'WITHDRAW_ERROR',
          message: err.response?.data?.message || 'Failed to withdraw application',
        },
      };
    }
  }

  // ============ SAVED JOBS ============

  /**
   * Save a job (professionals)
   */
  async saveJob(jobId: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.post(`${this.baseUrl}/${jobId}/save`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: err.response?.data?.message || 'Failed to save job',
        },
      };
    }
  }

  /**
   * Unsave a job (professionals)
   */
  async unsaveJob(jobId: string): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`${this.baseUrl}/${jobId}/save`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'UNSAVE_ERROR',
          message: err.response?.data?.message || 'Failed to unsave job',
        },
      };
    }
  }

  /**
   * Get saved jobs (professionals)
   */
  async getSavedJobs(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<JobListItem>>> {
    try {
      const data = await apiClient.get<PaginatedResponse<JobListItem>>(
        `${this.baseUrl}/saved?page=${page}&limit=${limit}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch saved jobs',
        },
      };
    }
  }

  // ============ MATCHING ============

  /**
   * Get match score breakdown for a job (professionals)
   */
  async getMatchScore(jobId: string): Promise<ApiResponse<MatchScoreBreakdown>> {
    try {
      const data = await apiClient.get<MatchScoreBreakdown>(
        `${this.baseUrl}/${jobId}/match-score`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'MATCH_ERROR',
          message: err.response?.data?.message || 'Failed to calculate match score',
        },
      };
    }
  }

  /**
   * Get recommended jobs for professional
   */
  async getRecommendedJobs(limit = 10): Promise<ApiResponse<JobListItem[]>> {
    try {
      const data = await apiClient.get<JobListItem[]>(
        `${this.baseUrl}/recommended?limit=${limit}`
      );
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: err.response?.data?.message || 'Failed to fetch recommendations',
        },
      };
    }
  }

  // ============ UTILITIES ============

  /**
   * Check if user has already applied for a job
   */
  async hasApplied(jobId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ hasApplied: boolean }>(
        `${this.baseUrl}/${jobId}/has-applied`
      );
      return response.hasApplied;
    } catch {
      return false;
    }
  }

  /**
   * Check if job is saved
   */
  async isSaved(jobId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ isSaved: boolean }>(
        `${this.baseUrl}/${jobId}/is-saved`
      );
      return response.isSaved;
    } catch {
      return false;
    }
  }
}

const jobService = new JobService();
export default jobService;

