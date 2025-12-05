// Re-export all types
export * from './business';
export * from './employee';
export * from './ownership';
// Professional types - rename addressSchema to avoid conflict with business
export type {
  VerificationStatus as ProfessionalVerificationStatus,
  SkillCategory,
  Skill,
  Certification as ProfessionalCertification,
  VerificationCertificate,
  Professional,
  ProfessionalListItem,
  ProfessionalFilters,
  ResidencyVerificationRequest,
  ResidencyVerificationResult,
  ProfessionalFormData,
  ApiResponse as ProfessionalApiResponse,
  PaginatedResponse as ProfessionalPaginatedResponse,
} from './professional';
export {
  AVAILABLE_SKILLS,
  COMMON_CERTIFICATIONS,
  addressSchema as professionalAddressSchema,
  skillSchema,
  certificationSchema as professionalCertificationSchema,
  professionalFormSchema,
} from './professional';
// Job types - use addressSchema from business, not from job
export type {
  EmploymentType,
  JobStatus,
  ApplicationStatus,
  SalaryRange,
  RequiredSkill,
  Job,
  JobListItem,
  JobFilters,
  JobApplication,
  ApplicationFormData as JobApplicationFormData,
  MatchScoreBreakdown,
  JobFormDataValidated as JobFormData,
  ApplicationFormDataValidated,
  ApiResponse as JobApiResponse,
  PaginatedResponse as JobPaginatedResponse,
} from './job';
export {
  EMPLOYMENT_TYPE_OPTIONS,
  REMOTE_POLICY_OPTIONS,
  APPLICATION_STATUS_STYLES,
  salaryRangeSchema,
  requiredSkillSchema,
  addressSchema,
  jobFormSchema,
  applicationFormSchema,
} from './job';
// Agency types - export with care for conflicts
export type {
  VerificationStatus,
  RiskLevel,
  ContractorSearchResult,
  ComplianceBreakdown,
  ContractorVerification,
  BulkVerificationItem,
  BulkVerificationSummary,
  BulkVerificationResult,
  VerificationHistoryRecord,
  VerificationReport,
  ContractorSearchParams,
  VerificationHistoryFilters,
} from './agency';
export * from './analytics';
export * from './contract';
export * from './notification';
export * from './document';
export * from './ocr';
export * from './compliance';

/**
 * HUBZone entity
 */
export interface Hubzone {
  id: string;
  name: string;
  zone_type: HubzoneType;
  state: string;
  county: string;
  designation_date: string;
  expiration_date: string | null;
  status: HubzoneStatus;
  geometry?: GeoJSON.Geometry;
}

export type HubzoneType =
  | 'qualified_census_tract'
  | 'qualified_non_metro_county'
  | 'indian_lands'
  | 'base_closure_area'
  | 'governor_designated'
  | 'redesignated';

export type HubzoneStatus = 'active' | 'expired' | 'pending' | 'redesignated';

/**
 * Certification entity
 */
export interface Certification {
  id: string;
  businessId: string;
  applicationDate: string;
  status: CertificationStatus;
  hubzoneId: string;
  reviewerId: string | null;
  notes: string | null;
}

export type CertificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'withdrawn';

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export type UserRole = 'user' | 'admin' | 'reviewer';

/**
 * Business entity
 */
export interface Business {
  id: string;
  userId: string;
  name: string;
  dunsNumber: string;
  ein: string;
  primaryAddress: Address;
  website?: string;
  phone: string;
}

/**
 * Address
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Pagination
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Notification types are re-exported from './notification'

