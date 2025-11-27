import { z } from 'zod';
import type { Address } from './index';

/**
 * HUBZone residence status
 */
export type HubzoneResidenceStatus = 'resident' | 'non_resident' | 'pending_verification' | 'unknown';

/**
 * Employment status
 */
export type EmploymentStatus = 'active' | 'terminated' | 'on_leave';

/**
 * Address change record for history
 */
export interface AddressChange {
  id: string;
  employeeId: string;
  address: Address;
  effectiveDate: string;
  endDate?: string;
  hubzoneStatus: HubzoneResidenceStatus;
  hubzoneType?: string;
  verifiedAt?: string;
  notes?: string;
}

/**
 * Employee entity
 */
export interface Employee {
  id: string;
  businessId: string;
  
  // Personal Info
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  
  // Employment
  employmentStatus: EmploymentStatus;
  employmentDate: string;
  terminationDate?: string;
  jobTitle?: string;
  department?: string;
  
  // Current Address & HUBZone Status
  currentAddress: Address;
  hubzoneStatus: HubzoneResidenceStatus;
  hubzoneType?: string;
  lastVerifiedAt?: string;
  
  // Address History
  addressHistory: AddressChange[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Employee list item (for table display)
 */
export interface EmployeeListItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  city: string;
  state: string;
  hubzoneStatus: HubzoneResidenceStatus;
  employmentStatus: EmploymentStatus;
  employmentDate: string;
  lastVerifiedAt?: string;
}

/**
 * Employee filters for list view
 */
export interface EmployeeFilters {
  hubzoneStatus?: HubzoneResidenceStatus;
  employmentStatus?: EmploymentStatus;
  search?: string;
  sortBy?: 'name' | 'employmentDate' | 'hubzoneStatus' | 'address';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Compliance metrics for employees
 */
export interface EmployeeComplianceMetrics {
  totalEmployees: number;
  hubzoneResidents: number;
  nonResidents: number;
  pendingVerification: number;
  compliancePercentage: number;
  requiredPercentage: number;
  isCompliant: boolean;
  employeesNeededForCompliance: number;
}

/**
 * Bulk import result
 */
export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: {
    row: number;
    field?: string;
    message: string;
    data?: Record<string, unknown>;
  }[];
  importedEmployees: EmployeeListItem[];
}

// Zod Schemas for validation

export const employeeAddressSchema = z.object({
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  country: z.string().default('US'),
});

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  jobTitle: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  employmentDate: z.string().min(1, 'Employment date is required'),
  currentAddress: employeeAddressSchema,
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

/**
 * CSV import row schema
 */
export const csvImportRowSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  employment_date: z.string().min(1, 'Employment date is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2).max(2),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
});

export type CSVImportRow = z.infer<typeof csvImportRowSchema>;

