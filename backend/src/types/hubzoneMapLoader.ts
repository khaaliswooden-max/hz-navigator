/**
 * HUBZone Map Loader Types
 * Types for Census tract boundaries, SBA designations, and map import operations
 */

import type { HubzoneType, HubzoneStatus } from './hubzone.js';

/**
 * GeoJSON Feature for Census tract
 */
export interface TractFeature {
  type: 'Feature';
  properties: TractProperties;
  geometry: GeoJSONGeometry;
}

/**
 * Census tract properties
 */
export interface TractProperties {
  GEOID: string;
  STATEFP: string;
  COUNTYFP: string;
  TRACTCE: string;
  NAME: string;
  NAMELSAD: string;
  MTFCC: string;
  FUNCSTAT: string;
  ALAND: number;
  AWATER: number;
  INTPTLAT: string;
  INTPTLON: string;
}

/**
 * GeoJSON geometry types
 */
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString' | 'MultiPoint';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

/**
 * GeoJSON FeatureCollection
 */
export interface FeatureCollection<T = TractFeature> {
  type: 'FeatureCollection';
  features: T[];
}

/**
 * Cache metadata for downloaded files
 */
export interface CacheMetadata {
  filePath: string;
  downloadedAt: Date;
  expiresAt: Date;
  checksum?: string;
  sourceUrl: string;
  fileSize: number;
}

/**
 * State FIPS codes mapping
 */
export interface StateFIPSMapping {
  fips: string;
  name: string;
  abbreviation: string;
}

/**
 * HUBZone designation from SBA
 */
export interface HUBZoneDesignation {
  geoid: string;
  tractId: string;
  state: string;
  county: string;
  designationType: HubzoneType;
  status: HubzoneStatus;
  designationDate: Date;
  expirationDate: Date | null;
  isRedesignated: boolean;
  gracePeriodEndDate: Date | null;
  sourceDataset: 'sba_api' | 'public_dataset' | 'census_acs';
}

/**
 * Qualified Census Tract (QCT) criteria
 */
export interface QCTCriteria {
  povertyRate: number;
  medianIncome: number;
  areaMedianIncome: number;
  qualifiesByPoverty: boolean;
  qualifiesByIncome: boolean;
  isQualified: boolean;
}

/**
 * Census ACS data for a tract
 */
export interface CensusACSData {
  geoid: string;
  state: string;
  county: string;
  tract: string;
  totalPopulation: number;
  povertyPopulation: number;
  povertyRate: number;
  medianHouseholdIncome: number;
  medianFamilyIncome: number;
  areaMedianIncome: number;
  year: number;
}

/**
 * Redesignated area information
 */
export interface RedesignatedArea {
  geoid: string;
  originalDesignationDate: Date;
  redesignationDate: Date;
  gracePeriodEndDate: Date;
  previousType: HubzoneType;
  reason: 'income_threshold_exceeded' | 'poverty_rate_decreased' | 'program_change' | 'other';
}

/**
 * Map import result metadata
 */
export interface MapImportResult {
  success: boolean;
  importId: string;
  importedAt: Date;
  statistics: ImportStatistics;
  errors: ImportError[];
  warnings: ImportWarning[];
  affectedBusinessCount: number;
}

/**
 * Import statistics
 */
export interface ImportStatistics {
  totalTracts: number;
  newDesignations: number;
  updatedDesignations: number;
  expiredDesignations: number;
  redesignatedAreas: number;
  activeHubzones: number;
  processingTimeMs: number;
}

/**
 * Import error
 */
export interface ImportError {
  geoid?: string;
  code: string;
  message: string;
  severity: 'error' | 'fatal';
  timestamp: Date;
}

/**
 * Import warning
 */
export interface ImportWarning {
  geoid?: string;
  code: string;
  message: string;
  timestamp: Date;
}

/**
 * Download progress callback
 */
export type DownloadProgressCallback = (progress: DownloadProgress) => void;

/**
 * Download progress information
 */
export interface DownloadProgress {
  stage: 'downloading' | 'extracting' | 'converting' | 'processing';
  currentState?: string;
  statesCompleted: number;
  totalStates: number;
  bytesDownloaded: number;
  totalBytes: number;
  percentComplete: number;
}

/**
 * HUBZone map update record
 */
export interface HUBZoneMapUpdate {
  id: string;
  importId: string;
  sourceType: 'tiger_line' | 'sba_api' | 'census_acs' | 'manual';
  sourceVersion: string;
  importedAt: Date;
  importedBy: string;
  statistics: ImportStatistics;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  notes?: string;
}

/**
 * Business affected by HUBZone change
 */
export interface AffectedBusiness {
  businessId: string;
  businessName: string;
  previousStatus: 'in_hubzone' | 'not_in_hubzone';
  newStatus: 'in_hubzone' | 'not_in_hubzone';
  changeType: 'gained_hubzone' | 'lost_hubzone' | 'hubzone_redesignated';
  affectedGeoid: string;
  hubzoneName: string;
  gracePeriodEndDate?: Date;
  notificationSent: boolean;
  notificationSentAt?: Date;
}

/**
 * Loader configuration options
 */
export interface HUBZoneMapLoaderConfig {
  cacheDirectory: string;
  cacheDurationDays: number;
  censusApiKey?: string;
  sbaApiEndpoint: string;
  tigerLineBaseUrl: string;
  censusAcsBaseUrl: string;
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  enableNotifications: boolean;
  dryRun: boolean;
}

/**
 * Default loader configuration
 */
export const DEFAULT_LOADER_CONFIG: HUBZoneMapLoaderConfig = {
  cacheDirectory: './cache/hubzone-maps',
  cacheDurationDays: 90,
  sbaApiEndpoint: 'https://api.sba.gov/hubzone',
  tigerLineBaseUrl: 'https://www2.census.gov/geo/tiger',
  censusAcsBaseUrl: 'https://api.census.gov/data',
  batchSize: 1000,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 60000,
  enableNotifications: true,
  dryRun: false,
};

/**
 * All US state FIPS codes
 */
export const STATE_FIPS_CODES: StateFIPSMapping[] = [
  { fips: '01', name: 'Alabama', abbreviation: 'AL' },
  { fips: '02', name: 'Alaska', abbreviation: 'AK' },
  { fips: '04', name: 'Arizona', abbreviation: 'AZ' },
  { fips: '05', name: 'Arkansas', abbreviation: 'AR' },
  { fips: '06', name: 'California', abbreviation: 'CA' },
  { fips: '08', name: 'Colorado', abbreviation: 'CO' },
  { fips: '09', name: 'Connecticut', abbreviation: 'CT' },
  { fips: '10', name: 'Delaware', abbreviation: 'DE' },
  { fips: '11', name: 'District of Columbia', abbreviation: 'DC' },
  { fips: '12', name: 'Florida', abbreviation: 'FL' },
  { fips: '13', name: 'Georgia', abbreviation: 'GA' },
  { fips: '15', name: 'Hawaii', abbreviation: 'HI' },
  { fips: '16', name: 'Idaho', abbreviation: 'ID' },
  { fips: '17', name: 'Illinois', abbreviation: 'IL' },
  { fips: '18', name: 'Indiana', abbreviation: 'IN' },
  { fips: '19', name: 'Iowa', abbreviation: 'IA' },
  { fips: '20', name: 'Kansas', abbreviation: 'KS' },
  { fips: '21', name: 'Kentucky', abbreviation: 'KY' },
  { fips: '22', name: 'Louisiana', abbreviation: 'LA' },
  { fips: '23', name: 'Maine', abbreviation: 'ME' },
  { fips: '24', name: 'Maryland', abbreviation: 'MD' },
  { fips: '25', name: 'Massachusetts', abbreviation: 'MA' },
  { fips: '26', name: 'Michigan', abbreviation: 'MI' },
  { fips: '27', name: 'Minnesota', abbreviation: 'MN' },
  { fips: '28', name: 'Mississippi', abbreviation: 'MS' },
  { fips: '29', name: 'Missouri', abbreviation: 'MO' },
  { fips: '30', name: 'Montana', abbreviation: 'MT' },
  { fips: '31', name: 'Nebraska', abbreviation: 'NE' },
  { fips: '32', name: 'Nevada', abbreviation: 'NV' },
  { fips: '33', name: 'New Hampshire', abbreviation: 'NH' },
  { fips: '34', name: 'New Jersey', abbreviation: 'NJ' },
  { fips: '35', name: 'New Mexico', abbreviation: 'NM' },
  { fips: '36', name: 'New York', abbreviation: 'NY' },
  { fips: '37', name: 'North Carolina', abbreviation: 'NC' },
  { fips: '38', name: 'North Dakota', abbreviation: 'ND' },
  { fips: '39', name: 'Ohio', abbreviation: 'OH' },
  { fips: '40', name: 'Oklahoma', abbreviation: 'OK' },
  { fips: '41', name: 'Oregon', abbreviation: 'OR' },
  { fips: '42', name: 'Pennsylvania', abbreviation: 'PA' },
  { fips: '44', name: 'Rhode Island', abbreviation: 'RI' },
  { fips: '45', name: 'South Carolina', abbreviation: 'SC' },
  { fips: '46', name: 'South Dakota', abbreviation: 'SD' },
  { fips: '47', name: 'Tennessee', abbreviation: 'TN' },
  { fips: '48', name: 'Texas', abbreviation: 'TX' },
  { fips: '49', name: 'Utah', abbreviation: 'UT' },
  { fips: '50', name: 'Vermont', abbreviation: 'VT' },
  { fips: '51', name: 'Virginia', abbreviation: 'VA' },
  { fips: '53', name: 'Washington', abbreviation: 'WA' },
  { fips: '54', name: 'West Virginia', abbreviation: 'WV' },
  { fips: '55', name: 'Wisconsin', abbreviation: 'WI' },
  { fips: '56', name: 'Wyoming', abbreviation: 'WY' },
  { fips: '72', name: 'Puerto Rico', abbreviation: 'PR' },
  { fips: '78', name: 'Virgin Islands', abbreviation: 'VI' },
  { fips: '66', name: 'Guam', abbreviation: 'GU' },
  { fips: '69', name: 'Northern Mariana Islands', abbreviation: 'MP' },
  { fips: '60', name: 'American Samoa', abbreviation: 'AS' },
];

/**
 * QCT qualification thresholds
 */
export const QCT_THRESHOLDS = {
  POVERTY_RATE_MINIMUM: 25.0, // >= 25% poverty rate
  INCOME_RATIO_MAXIMUM: 0.80, // <= 80% of area median income
} as const;

/**
 * Census API variable codes for ACS data
 */
export const CENSUS_ACS_VARIABLES = {
  TOTAL_POPULATION: 'B01001_001E',
  POVERTY_UNIVERSE: 'B17001_001E',
  POVERTY_BELOW: 'B17001_002E',
  MEDIAN_HOUSEHOLD_INCOME: 'B19013_001E',
  MEDIAN_FAMILY_INCOME: 'B19113_001E',
} as const;

