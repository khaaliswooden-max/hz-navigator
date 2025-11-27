/**
 * Map API Types
 * Types for vector tiles, spatial queries, and map-related operations
 */

import type { HubzoneType, HubzoneStatus } from './hubzone.js';

/**
 * Vector tile coordinates
 */
export interface TileCoordinates {
  z: number; // Zoom level
  x: number; // Tile column
  y: number; // Tile row
}

/**
 * Tile cache entry
 */
export interface TileCacheEntry {
  tile: Buffer;
  cachedAt: Date;
  expiresAt: Date;
  tileKey: string;
}

/**
 * Radius search input
 */
export interface RadiusSearchInput {
  latitude: number;
  longitude: number;
  radiusMiles: number;
}

/**
 * Radius search result item
 */
export interface RadiusSearchResult {
  id: string;
  geoid: string;
  name: string;
  zoneType: HubzoneType;
  status: HubzoneStatus;
  state: string;
  county: string;
  distanceMiles: number;
  designationDate: Date;
  expirationDate: Date | null;
  isRedesignated: boolean;
  gracePeriodEndDate: Date | null;
}

/**
 * Radius search response
 */
export interface RadiusSearchResponse {
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMiles: number;
  results: RadiusSearchResult[];
  totalCount: number;
}

/**
 * Tract detail response
 */
export interface TractDetailResponse {
  id: string;
  geoid: string;
  name: string;
  zoneType: HubzoneType;
  status: HubzoneStatus;
  state: string;
  county: string;
  designationDate: Date;
  expirationDate: Date | null;
  isRedesignated: boolean;
  gracePeriodEndDate: Date | null;
  geometry: GeoJSONFeature;
  designationHistory: DesignationHistoryEntry[];
  businessCount: number;
  areaSquareMiles: number;
  populationEstimate: number | null;
}

/**
 * Designation history entry
 */
export interface DesignationHistoryEntry {
  id: string;
  zoneType: HubzoneType;
  status: HubzoneStatus;
  effectiveDate: Date;
  endDate: Date | null;
  reason: string | null;
  createdAt: Date;
}

/**
 * GeoJSON Feature
 */
export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

/**
 * GeoJSON FeatureCollection
 */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * HUBZone statistics response
 */
export interface HubzoneStatisticsResponse {
  totalTracts: number;
  designatedTracts: number;
  activeTracts: number;
  byType: {
    qualifiedCensusTracts: number;
    qualifiedNonMetroCounties: number;
    indianLands: number;
    baseClosureAreas: number;
    governorDesignated: number;
    redesignated: number;
  };
  byStatus: {
    active: number;
    expired: number;
    pending: number;
    redesignated: number;
  };
  lastUpdateDate: Date | null;
  lastImportId: string | null;
  topStatesByBusinessCount: StateBusinessCount[];
  totalCertifiedBusinesses: number;
}

/**
 * State business count
 */
export interface StateBusinessCount {
  state: string;
  stateAbbreviation: string;
  businessCount: number;
  tractCount: number;
}

/**
 * Export input options
 */
export interface ExportInput {
  state?: string;
  county?: string;
  format: 'geojson' | 'csv';
  zoneTypes?: HubzoneType[];
  statusFilter?: HubzoneStatus[];
}

/**
 * Export result metadata
 */
export interface ExportResult {
  filename: string;
  contentType: string;
  data: Buffer | string;
  recordCount: number;
}

/**
 * CSV export row
 */
export interface CSVExportRow {
  geoid: string;
  name: string;
  zone_type: string;
  status: string;
  state: string;
  county: string;
  designation_date: string;
  expiration_date: string;
  is_redesignated: string;
  grace_period_end_date: string;
  latitude: string;
  longitude: string;
}

/**
 * Tile generation options
 */
export interface TileGenerationOptions {
  extent: number;        // MVT extent (default 4096)
  buffer: number;        // Buffer around tile in pixels (default 256)
  clipGeom: boolean;     // Whether to clip geometries to tile bounds
  simplifyTolerance: number; // Geometry simplification tolerance
}

/**
 * Default tile generation options
 */
export const DEFAULT_TILE_OPTIONS: TileGenerationOptions = {
  extent: 4096,
  buffer: 256,
  clipGeom: true,
  simplifyTolerance: 0,
};

/**
 * Tile cache configuration
 */
export interface TileCacheConfig {
  enabled: boolean;
  ttlSeconds: number;   // Time to live in seconds
  maxSize: number;      // Maximum cache size in entries
}

/**
 * Default tile cache configuration
 */
export const DEFAULT_TILE_CACHE_CONFIG: TileCacheConfig = {
  enabled: true,
  ttlSeconds: 86400,    // 24 hours
  maxSize: 10000,       // 10,000 tiles
};

/**
 * Miles to meters conversion constant
 */
export const MILES_TO_METERS = 1609.34;

/**
 * Maximum radius search distance in miles
 */
export const MAX_RADIUS_MILES = 100;

/**
 * Maximum results for radius search
 */
export const MAX_RADIUS_RESULTS = 100;

