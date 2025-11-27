/**
 * HUBZone entity type
 */
export interface Hubzone {
  id: string;
  name: string;
  zone_type: HubzoneType;
  state: string;
  county: string;
  designation_date: Date;
  expiration_date: Date | null;
  status: HubzoneStatus;
  geometry: string; // GeoJSON string
  created_at: Date;
  updated_at: Date;
}

/**
 * Types of HUBZone designations
 */
export type HubzoneType =
  | 'qualified_census_tract'
  | 'qualified_non_metro_county'
  | 'indian_lands'
  | 'base_closure_area'
  | 'governor_designated'
  | 'redesignated';

/**
 * HUBZone status
 */
export type HubzoneStatus = 'active' | 'expired' | 'pending' | 'redesignated';

/**
 * Pagination metadata
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * List result with pagination
 */
export interface HubzoneListResult {
  data: Hubzone[];
  pagination: Pagination;
}

/**
 * Coordinates for location check
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Result of a location check
 */
export interface LocationCheckResult {
  isInHubzone: boolean;
  coordinates: Coordinates;
  matchingZones: Partial<Hubzone>[];
  checkedAt: string;
}

/**
 * Certification application
 */
export interface Certification {
  id: string;
  business_id: string;
  application_date: Date;
  status: CertificationStatus;
  hubzone_id: string;
  primary_address: Address;
  employee_count: number;
  hubzone_employees_percentage: number;
  reviewer_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Certification status
 */
export type CertificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'withdrawn';

/**
 * Address structure
 */
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

