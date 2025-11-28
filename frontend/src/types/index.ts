// Re-export all types
export * from './business';
export * from './employee';
export * from './ownership';
export * from './professional';
export * from './job';
export * from './agency';
export * from './analytics';
export * from './contract';
export * from './notification';

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

