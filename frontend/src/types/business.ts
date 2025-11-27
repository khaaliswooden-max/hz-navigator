import { z } from 'zod';
import type { Address } from './index';

/**
 * Certification status types
 */
export type BusinessCertificationStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'withdrawn';

/**
 * Business ownership type
 */
export type OwnershipType =
  | 'sole_proprietor'
  | 'partnership'
  | 'llc'
  | 'corporation'
  | 's_corporation'
  | 'non_profit'
  | 'other';

/**
 * NAICS Code
 */
export interface NAICSCode {
  code: string;
  title: string;
  isPrimary?: boolean;
}

/**
 * Business owner information
 */
export interface BusinessOwner {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  ownershipPercentage: number;
  email?: string;
  phone?: string;
  isControlPerson: boolean;
}

/**
 * Extended Business entity for profile management
 */
export interface BusinessProfile {
  id: string;
  userId: string;
  
  // Basic Info
  legalName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  
  // Contact
  phone: string;
  email?: string;
  website?: string;
  
  // Addresses
  principalOffice: Address;
  mailingAddress?: Address;
  
  // Business Details
  ownershipType: OwnershipType;
  dateEstablished?: string;
  annualRevenue?: number;
  employeeCount?: number;
  
  // NAICS Codes
  naicsCodes: NAICSCode[];
  
  // Ownership
  owners: BusinessOwner[];
  
  // Certification
  certificationStatus: BusinessCertificationStatus;
  certificationDate?: string;
  expirationDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Business list item (for table display)
 */
export interface BusinessListItem {
  id: string;
  legalName: string;
  dbaName?: string;
  ueiNumber: string;
  state: string;
  certificationStatus: BusinessCertificationStatus;
  certificationDate?: string;
  expirationDate?: string;
  createdAt: string;
}

/**
 * Business filters for list view
 */
export interface BusinessFilters {
  status?: BusinessCertificationStatus;
  state?: string;
  search?: string;
  certificationDateFrom?: string;
  certificationDateTo?: string;
  page?: number;
  limit?: number;
}

// Zod Schemas for validation

export const addressSchema = z.object({
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'Use 2-letter state code'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  country: z.string().default('US'),
});

export const naicsCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'NAICS code must be 6 digits'),
  title: z.string().min(1, 'NAICS title is required'),
  isPrimary: z.boolean().optional(),
});

export const businessOwnerSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  title: z.string().min(1, 'Title is required'),
  ownershipPercentage: z.number().min(0).max(100, 'Must be between 0 and 100'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  isControlPerson: z.boolean().default(false),
});

export const businessFormSchema = z.object({
  // Basic Info
  legalName: z.string().min(1, 'Legal name is required').max(200, 'Name too long'),
  dbaName: z.string().max(200, 'DBA name too long').optional().or(z.literal('')),
  ueiNumber: z.string()
    .regex(/^[A-Z0-9]{12}$/, 'UEI must be 12 alphanumeric characters')
    .or(z.literal('')),
  cageCode: z.string()
    .regex(/^[A-Z0-9]{5}$/, 'CAGE code must be 5 alphanumeric characters')
    .optional()
    .or(z.literal('')),
  
  // Contact
  phone: z.string().regex(/^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  
  // Address
  principalOffice: addressSchema,
  
  // Business Details
  ownershipType: z.enum([
    'sole_proprietor',
    'partnership',
    'llc',
    'corporation',
    's_corporation',
    'non_profit',
    'other',
  ]),
  dateEstablished: z.string().optional(),
  employeeCount: z.number().min(0).optional(),
  
  // NAICS
  naicsCodes: z.array(naicsCodeSchema).min(1, 'At least one NAICS code is required'),
});

export type BusinessFormData = z.infer<typeof businessFormSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;

