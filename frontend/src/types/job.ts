import { z } from 'zod';
import type { Address } from './index';

/**
 * Employment type
 */
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';

/**
 * Job status
 */
export type JobStatus = 'draft' | 'published' | 'closed' | 'filled';

/**
 * Application status
 */
export type ApplicationStatus = 
  | 'applied' 
  | 'reviewed' 
  | 'shortlisted' 
  | 'interviewing' 
  | 'offered' 
  | 'hired' 
  | 'rejected' 
  | 'withdrawn';

/**
 * Salary range
 */
export interface SalaryRange {
  min: number;
  max: number;
  type: 'hourly' | 'annual';
  currency: string;
}

/**
 * Required skill for a job
 */
export interface RequiredSkill {
  id: string;
  name: string;
  required: boolean; // required vs preferred
  yearsRequired?: number;
}

/**
 * Job posting entity
 */
export interface Job {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  
  // Job details
  title: string;
  description: string;
  responsibilities?: string;
  qualifications?: string;
  benefits?: string;
  
  // Requirements
  hubzoneResidentRequired: boolean;
  skills: RequiredSkill[];
  experienceYears?: number;
  educationRequired?: string;
  
  // Compensation
  salaryRange: SalaryRange;
  employmentType: EmploymentType;
  
  // Location
  location: Address;
  isRemote: boolean;
  remotePolicy?: 'fully_remote' | 'hybrid' | 'on_site';
  
  // Status
  status: JobStatus;
  applicationCount: number;
  viewCount: number;
  
  // Metadata
  postedAt: string;
  expiresAt?: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * Job list item (for cards)
 */
export interface JobListItem {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo?: string;
  title: string;
  salaryRange: SalaryRange;
  location: Address;
  isRemote: boolean;
  hubzoneResidentRequired: boolean;
  employmentType: EmploymentType;
  skills: string[];
  postedAt: string;
  matchScore?: number; // Calculated for professionals
  distanceMiles?: number; // Calculated based on professional location
}

/**
 * Job application entity
 */
export interface JobApplication {
  id: string;
  jobId: string;
  professionalId: string;
  
  // Applicant info (snapshot)
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  
  // Application content
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  
  // Status tracking
  status: ApplicationStatus;
  statusHistory: {
    status: ApplicationStatus;
    date: string;
    note?: string;
  }[];
  
  // Scores
  matchScore: number;
  skillsMatchScore: number;
  experienceScore: number;
  hubzoneScore: number;
  locationScore: number;
  
  // Metadata
  appliedAt: string;
  updatedAt: string;
}

/**
 * Job filters for search
 */
export interface JobFilters {
  search?: string;
  hubzoneOnly?: boolean;
  employmentType?: EmploymentType[];
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'hourly' | 'annual';
  location?: {
    state?: string;
    city?: string;
    zipCode?: string;
    radius?: number; // in miles
  };
  skills?: string[];
  isRemote?: boolean;
  sortBy?: 'date' | 'salary' | 'match_score';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Job form data for posting
 */
export interface JobFormData {
  title: string;
  description: string;
  responsibilities?: string;
  qualifications?: string;
  benefits?: string;
  hubzoneResidentRequired: boolean;
  skills: RequiredSkill[];
  experienceYears?: number;
  educationRequired?: string;
  salaryRange: SalaryRange;
  employmentType: EmploymentType;
  location: Address;
  isRemote: boolean;
  remotePolicy?: 'fully_remote' | 'hybrid' | 'on_site';
  expiresAt?: string;
}

/**
 * Application form data
 */
export interface ApplicationFormData {
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  phone?: string;
}

/**
 * Match score breakdown
 */
export interface MatchScoreBreakdown {
  total: number;
  skills: {
    score: number;
    weight: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  experience: {
    score: number;
    weight: number;
    yearsRequired: number;
    yearsHave: number;
  };
  hubzone: {
    score: number;
    weight: number;
    isRequired: boolean;
    isResident: boolean;
  };
  location: {
    score: number;
    weight: number;
    distanceMiles: number;
    isRemote: boolean;
  };
}

// Employment type options
export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'internship', label: 'Internship' },
];

// Remote policy options
export const REMOTE_POLICY_OPTIONS = [
  { value: 'on_site', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'fully_remote', label: 'Fully Remote' },
];

// Application status styles
export const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, { bg: string; text: string; label: string }> = {
  applied: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Applied' },
  reviewed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Under Review' },
  shortlisted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Shortlisted' },
  interviewing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Interviewing' },
  offered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Offer Extended' },
  hired: { bg: 'bg-verified-100', text: 'text-verified-700', label: 'Hired' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Not Selected' },
  withdrawn: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Withdrawn' },
};

// Zod Schemas for validation

export const salaryRangeSchema = z.object({
  min: z.number().min(0, 'Minimum salary must be positive'),
  max: z.number().min(0, 'Maximum salary must be positive'),
  type: z.enum(['hourly', 'annual']),
  currency: z.string().default('USD'),
}).refine(data => data.max >= data.min, {
  message: 'Maximum salary must be greater than or equal to minimum',
  path: ['max'],
});

export const requiredSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  required: z.boolean(),
  yearsRequired: z.number().optional(),
});

export const addressSchema = z.object({
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  country: z.string().default('US'),
});

export const jobFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(10000, 'Description too long'),
  responsibilities: z.string().max(5000, 'Too long').optional(),
  qualifications: z.string().max(5000, 'Too long').optional(),
  benefits: z.string().max(3000, 'Too long').optional(),
  hubzoneResidentRequired: z.boolean().default(false),
  skills: z.array(requiredSkillSchema).min(1, 'Add at least one skill'),
  experienceYears: z.number().min(0).max(50).optional(),
  educationRequired: z.string().optional(),
  salaryRange: salaryRangeSchema,
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'temporary', 'internship']),
  location: addressSchema,
  isRemote: z.boolean().default(false),
  remotePolicy: z.enum(['fully_remote', 'hybrid', 'on_site']).optional(),
  expiresAt: z.string().optional(),
});

export const applicationFormSchema = z.object({
  coverLetter: z.string().max(5000, 'Cover letter too long').optional(),
  resumeUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export type JobFormDataValidated = z.infer<typeof jobFormSchema>;
export type ApplicationFormDataValidated = z.infer<typeof applicationFormSchema>;

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

