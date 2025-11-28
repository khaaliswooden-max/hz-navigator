import { z } from 'zod';
import type { Address } from './index';

/**
 * Professional verification status
 */
export type VerificationStatus = 'verified' | 'pending' | 'expired' | 'unverified';

/**
 * Skill category
 */
export type SkillCategory = 
  | 'technical'
  | 'management'
  | 'consulting'
  | 'engineering'
  | 'finance'
  | 'legal'
  | 'healthcare'
  | 'construction'
  | 'administrative'
  | 'other';

/**
 * Skill item
 */
export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  yearsOfExperience?: number;
}

/**
 * Certification record
 */
export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

/**
 * HUBZone residency verification certificate
 */
export interface VerificationCertificate {
  id: string;
  professionalId: string;
  certificateNumber: string;
  verificationDate: string;
  expirationDate: string;
  address: Address;
  hubzoneType: string;
  qrCodeData: string;
  isValid: boolean;
  pdfUrl?: string;
}

/**
 * Professional profile entity
 */
export interface Professional {
  id: string;
  userId: string;
  
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Current Address & HUBZone Status
  currentAddress: Address;
  verificationStatus: VerificationStatus;
  hubzoneType?: string;
  lastVerifiedAt?: string;
  nextVerificationDue?: string;
  
  // Professional Info
  headline?: string;
  summary?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  
  // Skills & Certifications
  skills: Skill[];
  certifications: Certification[];
  
  // Verification Certificate
  verificationCertificate?: VerificationCertificate;
  
  // Profile Settings
  isPublic: boolean;
  profileViewCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Professional list item (for business hiring view)
 */
export interface ProfessionalListItem {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  city: string;
  state: string;
  verificationStatus: VerificationStatus;
  hubzoneType?: string;
  skills: string[];
  lastVerifiedAt?: string;
}

/**
 * Professional filters for list view
 */
export interface ProfessionalFilters {
  verificationStatus?: VerificationStatus;
  skills?: string[];
  location?: {
    state?: string;
    city?: string;
    zipCode?: string;
    radius?: number; // in miles
  };
  search?: string;
  sortBy?: 'name' | 'verificationDate' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Residency verification request
 */
export interface ResidencyVerificationRequest {
  professionalId: string;
  address: Address;
}

/**
 * Residency verification result
 */
export interface ResidencyVerificationResult {
  isInHubzone: boolean;
  hubzoneType?: string;
  verificationDate: string;
  expirationDate: string;
  certificateId?: string;
  address: Address;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Available skills for multi-select
export const AVAILABLE_SKILLS: Skill[] = [
  // Technical
  { id: 'software-dev', name: 'Software Development', category: 'technical' },
  { id: 'cloud-computing', name: 'Cloud Computing', category: 'technical' },
  { id: 'cybersecurity', name: 'Cybersecurity', category: 'technical' },
  { id: 'data-analysis', name: 'Data Analysis', category: 'technical' },
  { id: 'database-admin', name: 'Database Administration', category: 'technical' },
  { id: 'network-admin', name: 'Network Administration', category: 'technical' },
  { id: 'devops', name: 'DevOps', category: 'technical' },
  { id: 'ai-ml', name: 'AI/Machine Learning', category: 'technical' },
  
  // Management
  { id: 'project-mgmt', name: 'Project Management', category: 'management' },
  { id: 'program-mgmt', name: 'Program Management', category: 'management' },
  { id: 'agile-scrum', name: 'Agile/Scrum', category: 'management' },
  { id: 'team-leadership', name: 'Team Leadership', category: 'management' },
  { id: 'strategic-planning', name: 'Strategic Planning', category: 'management' },
  
  // Consulting
  { id: 'business-analysis', name: 'Business Analysis', category: 'consulting' },
  { id: 'process-improvement', name: 'Process Improvement', category: 'consulting' },
  { id: 'change-mgmt', name: 'Change Management', category: 'consulting' },
  { id: 'it-consulting', name: 'IT Consulting', category: 'consulting' },
  
  // Engineering
  { id: 'civil-eng', name: 'Civil Engineering', category: 'engineering' },
  { id: 'mechanical-eng', name: 'Mechanical Engineering', category: 'engineering' },
  { id: 'electrical-eng', name: 'Electrical Engineering', category: 'engineering' },
  { id: 'systems-eng', name: 'Systems Engineering', category: 'engineering' },
  
  // Finance
  { id: 'accounting', name: 'Accounting', category: 'finance' },
  { id: 'financial-analysis', name: 'Financial Analysis', category: 'finance' },
  { id: 'budgeting', name: 'Budgeting', category: 'finance' },
  { id: 'procurement', name: 'Procurement', category: 'finance' },
  
  // Administrative
  { id: 'admin-support', name: 'Administrative Support', category: 'administrative' },
  { id: 'customer-service', name: 'Customer Service', category: 'administrative' },
  { id: 'data-entry', name: 'Data Entry', category: 'administrative' },
  { id: 'hr-admin', name: 'HR Administration', category: 'administrative' },
  
  // Construction
  { id: 'construction-mgmt', name: 'Construction Management', category: 'construction' },
  { id: 'hvac', name: 'HVAC', category: 'construction' },
  { id: 'electrical-work', name: 'Electrical Work', category: 'construction' },
  { id: 'plumbing', name: 'Plumbing', category: 'construction' },
];

// Common certifications
export const COMMON_CERTIFICATIONS = [
  'PMP (Project Management Professional)',
  'CompTIA Security+',
  'AWS Solutions Architect',
  'CISSP',
  'CPA (Certified Public Accountant)',
  'Six Sigma Green Belt',
  'Six Sigma Black Belt',
  'ITIL Foundation',
  'Scrum Master (CSM)',
  'Professional Engineer (PE)',
  'SHRM-CP',
  'Certified Information Systems Auditor (CISA)',
];

// Zod Schemas for validation

export const addressSchema = z.object({
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  country: z.string().default('US'),
});

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
    'technical', 'management', 'consulting', 'engineering',
    'finance', 'legal', 'healthcare', 'construction', 'administrative', 'other'
  ]),
  yearsOfExperience: z.number().optional(),
});

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Certification name is required'),
  issuingOrganization: z.string().min(1, 'Issuing organization is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

export const professionalFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional().or(z.literal('')),
  headline: z.string().max(120, 'Headline too long').optional().or(z.literal('')),
  summary: z.string().max(2000, 'Summary too long').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Enter a valid LinkedIn URL').optional().or(z.literal('')),
  currentAddress: addressSchema,
  skills: z.array(skillSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  isPublic: z.boolean().default(true),
});

export type ProfessionalFormData = z.infer<typeof professionalFormSchema>;

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

