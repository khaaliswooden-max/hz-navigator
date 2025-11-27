/**
 * Map Service
 *
 * Handles vector tile generation, spatial queries, and map-related operations
 * using PostGIS spatial functions.
 */

import { db } from './database.js';

import type {
  TileCoordinates,
  TileCacheEntry,
  TileCacheConfig,
  TileGenerationOptions,
  RadiusSearchInput,
  RadiusSearchResult,
  RadiusSearchResponse,
  TractDetailResponse,
  DesignationHistoryEntry,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  HubzoneStatisticsResponse,
  StateBusinessCount,
  ExportInput,
  ExportResult,
  CSVExportRow,
} from '../types/map.js';

import {
  DEFAULT_TILE_OPTIONS,
  DEFAULT_TILE_CACHE_CONFIG,
  MILES_TO_METERS,
  MAX_RADIUS_MILES,
  MAX_RADIUS_RESULTS,
} from '../types/map.js';

import type { HubzoneType, HubzoneStatus } from '../types/hubzone.js';

/**
 * Simple in-memory tile cache using Map
 */
class TileCache {
  private cache: Map<string, TileCacheEntry> = new Map();
  private config: TileCacheConfig;

  constructor(config: TileCacheConfig = DEFAULT_TILE_CACHE_CONFIG) {
    this.config = config;
  }

  /**
   * Get tile from cache
   */
  get(key: string): Buffer | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.tile;
  }

  /**
   * Set tile in cache
   */
  set(key: string, tile: Buffer): void {
    if (!this.config.enabled) return;

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.ttlSeconds * 1000);

    this.cache.set(key, {
      tile,
      cachedAt: now,
      expiresAt,
      tileKey: key,
    });
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need tracking for actual hit rate
    };
  }
}

/**
 * Map Service Class
 */
export class MapService {
  private tileCache: TileCache;
  private tileOptions: TileGenerationOptions;

  constructor(
    cacheConfig?: Partial<TileCacheConfig>,
    tileOptions?: Partial<TileGenerationOptions>
  ) {
    this.tileCache = new TileCache({ ...DEFAULT_TILE_CACHE_CONFIG, ...cacheConfig });
    this.tileOptions = { ...DEFAULT_TILE_OPTIONS, ...tileOptions };
  }

  /**
   * Generate Mapbox Vector Tile (MVT) for given coordinates
   *
   * Uses PostGIS ST_AsMVT function to generate Protocol Buffer format tiles
   *
   * @param coords - Tile coordinates (z, x, y)
   * @returns Buffer containing MVT data
   */
  async generateVectorTile(coords: TileCoordinates): Promise<Buffer> {
    const { z, x, y } = coords;
    const cacheKey = `tile_${z}_${x}_${y}`;

    // Check cache first
    const cachedTile = this.tileCache.get(cacheKey);
    if (cachedTile) {
      return cachedTile;
    }

    // Generate tile using PostGIS
    const query = `
      SELECT ST_AsMVT(tile, 'hubzone_designations', $4, 'geom') as mvt
      FROM (
        SELECT 
          id,
          geoid AS census_tract,
          zone_type AS hubzone_type,
          status,
          designation_date,
          expiration_date,
          is_redesignated,
          grace_period_end_date,
          state,
          county,
          name,
          ST_AsMVTGeom(
            geometry,
            ST_TileEnvelope($1, $2, $3),
            $4,
            $5,
            $6
          ) AS geom
        FROM hubzones
        WHERE geometry && ST_TileEnvelope($1, $2, $3)
          AND status IN ('active', 'redesignated')
      ) AS tile
      WHERE geom IS NOT NULL
    `;

    const result = await db.query<{ mvt: Buffer }>(query, [
      z,
      x,
      y,
      this.tileOptions.extent,
      this.tileOptions.buffer,
      this.tileOptions.clipGeom,
    ]);

    const mvtData = result.rows[0]?.mvt ?? Buffer.alloc(0);

    // Cache the tile
    this.tileCache.set(cacheKey, mvtData);

    return mvtData;
  }

  /**
   * Search for HUBZone tracts within a radius of a point
   *
   * @param input - Search parameters (latitude, longitude, radiusMiles)
   * @returns Array of HUBZone tracts within radius with distance
   */
  async radiusSearch(input: RadiusSearchInput): Promise<RadiusSearchResponse> {
    const { latitude, longitude, radiusMiles } = input;

    // Validate radius
    const validatedRadius = Math.min(Math.abs(radiusMiles), MAX_RADIUS_MILES);

    // Convert miles to meters
    const radiusMeters = validatedRadius * MILES_TO_METERS;

    const query = `
      SELECT 
        id,
        geoid,
        name,
        zone_type,
        status,
        state,
        county,
        designation_date,
        expiration_date,
        is_redesignated,
        grace_period_end_date,
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / $5 AS distance_miles
      FROM hubzones
      WHERE ST_DWithin(
        geometry::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      AND status IN ('active', 'redesignated')
      ORDER BY distance_miles ASC
      LIMIT $4
    `;

    const result = await db.query<{
      id: string;
      geoid: string;
      name: string;
      zone_type: HubzoneType;
      status: HubzoneStatus;
      state: string;
      county: string;
      designation_date: Date;
      expiration_date: Date | null;
      is_redesignated: boolean;
      grace_period_end_date: Date | null;
      distance_miles: number;
    }>(query, [longitude, latitude, radiusMeters, MAX_RADIUS_RESULTS, MILES_TO_METERS]);

    const results: RadiusSearchResult[] = result.rows.map((row) => ({
      id: row.id,
      geoid: row.geoid,
      name: row.name,
      zoneType: row.zone_type,
      status: row.status,
      state: row.state,
      county: row.county,
      distanceMiles: Math.round(row.distance_miles * 100) / 100,
      designationDate: row.designation_date,
      expirationDate: row.expiration_date,
      isRedesignated: row.is_redesignated,
      gracePeriodEndDate: row.grace_period_end_date,
    }));

    return {
      center: { latitude, longitude },
      radiusMiles: validatedRadius,
      results,
      totalCount: results.length,
    };
  }

  /**
   * Get detailed tract information by tract ID (GEOID)
   *
   * @param tractId - Census tract GEOID
   * @returns Detailed tract information with history and business count
   */
  async getTractDetails(tractId: string): Promise<TractDetailResponse | null> {
    // Get main tract info with geometry
    const tractQuery = `
      SELECT 
        h.id,
        h.geoid,
        h.name,
        h.zone_type,
        h.status,
        h.state,
        h.county,
        h.designation_date,
        h.expiration_date,
        h.is_redesignated,
        h.grace_period_end_date,
        ST_AsGeoJSON(h.geometry)::json as geometry,
        ST_Area(h.geometry::geography) / 2589988.11 as area_sq_miles,
        (
          SELECT COUNT(*) 
          FROM businesses b 
          WHERE ST_Contains(h.geometry, ST_SetSRID(ST_MakePoint(b.principal_office_lon, b.principal_office_lat), 4326))
        ) as business_count
      FROM hubzones h
      WHERE h.geoid = $1
    `;

    const tractResult = await db.query<{
      id: string;
      geoid: string;
      name: string;
      zone_type: HubzoneType;
      status: HubzoneStatus;
      state: string;
      county: string;
      designation_date: Date;
      expiration_date: Date | null;
      is_redesignated: boolean;
      grace_period_end_date: Date | null;
      geometry: object;
      area_sq_miles: number;
      business_count: string;
    }>(tractQuery, [tractId]);

    if (tractResult.rows.length === 0) {
      return null;
    }

    const tract = tractResult.rows[0];
    if (!tract) {
      return null;
    }

    // Get designation history
    const historyQuery = `
      SELECT 
        id,
        zone_type,
        status,
        effective_date,
        end_date,
        reason,
        created_at
      FROM hubzone_designation_history
      WHERE geoid = $1
      ORDER BY effective_date DESC
    `;

    const historyResult = await db.query<{
      id: string;
      zone_type: HubzoneType;
      status: HubzoneStatus;
      effective_date: Date;
      end_date: Date | null;
      reason: string | null;
      created_at: Date;
    }>(historyQuery, [tractId]);

    const history: DesignationHistoryEntry[] = historyResult.rows.map((row) => ({
      id: row.id,
      zoneType: row.zone_type,
      status: row.status,
      effectiveDate: row.effective_date,
      endDate: row.end_date,
      reason: row.reason,
      createdAt: row.created_at,
    }));

    return {
      id: tract.id,
      geoid: tract.geoid,
      name: tract.name,
      zoneType: tract.zone_type,
      status: tract.status,
      state: tract.state,
      county: tract.county,
      designationDate: tract.designation_date,
      expirationDate: tract.expiration_date,
      isRedesignated: tract.is_redesignated,
      gracePeriodEndDate: tract.grace_period_end_date,
      geometry: {
        type: 'Feature',
        properties: {
          geoid: tract.geoid,
          name: tract.name,
          zoneType: tract.zone_type,
          status: tract.status,
        },
        geometry: tract.geometry as GeoJSONFeature['geometry'],
      },
      designationHistory: history,
      businessCount: parseInt(tract.business_count, 10),
      areaSquareMiles: Math.round(tract.area_sq_miles * 100) / 100,
      populationEstimate: null, // Would require Census data lookup
    };
  }

  /**
   * Get HUBZone statistics
   *
   * @returns Aggregate statistics about HUBZone designations
   */
  async getStatistics(): Promise<HubzoneStatisticsResponse> {
    // Get counts by type and status
    const countsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('active', 'redesignated')) as designated,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE zone_type = 'qualified_census_tract') as qct,
        COUNT(*) FILTER (WHERE zone_type = 'qualified_non_metro_county') as qnmc,
        COUNT(*) FILTER (WHERE zone_type = 'indian_lands') as indian,
        COUNT(*) FILTER (WHERE zone_type = 'base_closure_area') as base_closure,
        COUNT(*) FILTER (WHERE zone_type = 'governor_designated') as governor,
        COUNT(*) FILTER (WHERE zone_type = 'redesignated' OR is_redesignated = true) as redesignated,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        MAX(updated_at) as last_update
      FROM hubzones
    `;

    const countsResult = await db.query<{
      total: string;
      designated: string;
      active: string;
      qct: string;
      qnmc: string;
      indian: string;
      base_closure: string;
      governor: string;
      redesignated: string;
      expired: string;
      pending: string;
      last_update: Date | null;
    }>(countsQuery);

    const counts = countsResult.rows[0];

    // Get last import info
    const importQuery = `
      SELECT import_id, completed_at
      FROM hubzone_map_updates
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `;

    const importResult = await db.query<{
      import_id: string;
      completed_at: Date;
    }>(importQuery);

    const lastImport = importResult.rows[0];

    // Get top states by business count
    const statesQuery = `
      SELECT 
        h.state,
        COUNT(DISTINCT b.id) as business_count,
        COUNT(DISTINCT h.id) as tract_count
      FROM hubzones h
      LEFT JOIN businesses b ON ST_Contains(
        h.geometry, 
        ST_SetSRID(ST_MakePoint(b.principal_office_lon, b.principal_office_lat), 4326)
      )
      WHERE h.status IN ('active', 'redesignated')
      GROUP BY h.state
      ORDER BY business_count DESC
      LIMIT 10
    `;

    const statesResult = await db.query<{
      state: string;
      business_count: string;
      tract_count: string;
    }>(statesQuery);

    const topStates: StateBusinessCount[] = statesResult.rows.map((row) => ({
      state: row.state,
      stateAbbreviation: this.getStateAbbreviation(row.state),
      businessCount: parseInt(row.business_count, 10),
      tractCount: parseInt(row.tract_count, 10),
    }));

    // Get total certified businesses
    const businessQuery = `
      SELECT COUNT(*) as total
      FROM businesses b
      JOIN hubzones h ON ST_Contains(
        h.geometry, 
        ST_SetSRID(ST_MakePoint(b.principal_office_lon, b.principal_office_lat), 4326)
      )
      WHERE h.status IN ('active', 'redesignated')
    `;

    const businessResult = await db.query<{ total: string }>(businessQuery);

    return {
      totalTracts: parseInt(counts?.total ?? '0', 10),
      designatedTracts: parseInt(counts?.designated ?? '0', 10),
      activeTracts: parseInt(counts?.active ?? '0', 10),
      byType: {
        qualifiedCensusTracts: parseInt(counts?.qct ?? '0', 10),
        qualifiedNonMetroCounties: parseInt(counts?.qnmc ?? '0', 10),
        indianLands: parseInt(counts?.indian ?? '0', 10),
        baseClosureAreas: parseInt(counts?.base_closure ?? '0', 10),
        governorDesignated: parseInt(counts?.governor ?? '0', 10),
        redesignated: parseInt(counts?.redesignated ?? '0', 10),
      },
      byStatus: {
        active: parseInt(counts?.active ?? '0', 10),
        expired: parseInt(counts?.expired ?? '0', 10),
        pending: parseInt(counts?.pending ?? '0', 10),
        redesignated: parseInt(counts?.redesignated ?? '0', 10),
      },
      lastUpdateDate: lastImport?.completed_at ?? counts?.last_update ?? null,
      lastImportId: lastImport?.import_id ?? null,
      topStatesByBusinessCount: topStates,
      totalCertifiedBusinesses: parseInt(businessResult.rows[0]?.total ?? '0', 10),
    };
  }

  /**
   * Export HUBZone data for a region
   *
   * @param input - Export options (state, county, format)
   * @returns Export data in requested format
   */
  async exportData(input: ExportInput): Promise<ExportResult> {
    const { state, county, format, zoneTypes, statusFilter } = input;

    // Build query conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (state) {
      conditions.push(`state = $${paramIndex++}`);
      params.push(state);
    }

    if (county) {
      conditions.push(`county = $${paramIndex++}`);
      params.push(county);
    }

    if (zoneTypes && zoneTypes.length > 0) {
      conditions.push(`zone_type = ANY($${paramIndex++})`);
      params.push(zoneTypes);
    }

    if (statusFilter && statusFilter.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(statusFilter);
    } else {
      conditions.push(`status IN ('active', 'redesignated')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (format === 'geojson') {
      return this.exportGeoJSON(whereClause, params, state, county);
    } else {
      return this.exportCSV(whereClause, params, state, county);
    }
  }

  /**
   * Export data as GeoJSON
   */
  private async exportGeoJSON(
    whereClause: string,
    params: unknown[],
    state?: string,
    county?: string
  ): Promise<ExportResult> {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'properties', json_build_object(
              'geoid', geoid,
              'name', name,
              'zone_type', zone_type,
              'status', status,
              'state', state,
              'county', county,
              'designation_date', designation_date,
              'expiration_date', expiration_date,
              'is_redesignated', is_redesignated,
              'grace_period_end_date', grace_period_end_date
            ),
            'geometry', ST_AsGeoJSON(geometry)::json
          )
        ), '[]'::json)
      ) as geojson
      FROM hubzones
      ${whereClause}
    `;

    const result = await db.query<{ geojson: GeoJSONFeatureCollection }>(query, params);
    const geojson = result.rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] };

    const filename = this.generateFilename('hubzones', 'geojson', state, county);

    return {
      filename,
      contentType: 'application/geo+json',
      data: JSON.stringify(geojson, null, 2),
      recordCount: geojson.features?.length ?? 0,
    };
  }

  /**
   * Export data as CSV
   */
  private async exportCSV(
    whereClause: string,
    params: unknown[],
    state?: string,
    county?: string
  ): Promise<ExportResult> {
    const query = `
      SELECT 
        geoid,
        name,
        zone_type,
        status,
        state,
        county,
        designation_date,
        expiration_date,
        is_redesignated,
        grace_period_end_date,
        ST_Y(ST_Centroid(geometry)) as latitude,
        ST_X(ST_Centroid(geometry)) as longitude
      FROM hubzones
      ${whereClause}
      ORDER BY state, county, geoid
    `;

    const result = await db.query<{
      geoid: string;
      name: string;
      zone_type: string;
      status: string;
      state: string;
      county: string;
      designation_date: Date;
      expiration_date: Date | null;
      is_redesignated: boolean;
      grace_period_end_date: Date | null;
      latitude: number;
      longitude: number;
    }>(query, params);

    // Build CSV
    const headers = [
      'geoid',
      'name',
      'zone_type',
      'status',
      'state',
      'county',
      'designation_date',
      'expiration_date',
      'is_redesignated',
      'grace_period_end_date',
      'latitude',
      'longitude',
    ];

    const rows: CSVExportRow[] = result.rows.map((row) => ({
      geoid: row.geoid,
      name: row.name,
      zone_type: row.zone_type,
      status: row.status,
      state: row.state,
      county: row.county,
      designation_date: row.designation_date?.toISOString().split('T')[0] ?? '',
      expiration_date: row.expiration_date?.toISOString().split('T')[0] ?? '',
      is_redesignated: row.is_redesignated ? 'true' : 'false',
      grace_period_end_date: row.grace_period_end_date?.toISOString().split('T')[0] ?? '',
      latitude: row.latitude?.toFixed(6) ?? '',
      longitude: row.longitude?.toFixed(6) ?? '',
    }));

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => this.escapeCSV(row[h as keyof CSVExportRow])).join(',')
      ),
    ].join('\n');

    const filename = this.generateFilename('hubzones', 'csv', state, county);

    return {
      filename,
      contentType: 'text/csv',
      data: csvContent,
      recordCount: rows.length,
    };
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Generate export filename
   */
  private generateFilename(
    prefix: string,
    ext: string,
    state?: string,
    county?: string
  ): string {
    const parts = [prefix];
    if (state) parts.push(state.toLowerCase().replace(/\s+/g, '_'));
    if (county) parts.push(county.toLowerCase().replace(/\s+/g, '_'));
    parts.push(new Date().toISOString().split('T')[0]);
    return `${parts.join('_')}.${ext}`;
  }

  /**
   * Get state abbreviation from state name
   */
  private getStateAbbreviation(stateName: string): string {
    const stateMap: Record<string, string> = {
      Alabama: 'AL',
      Alaska: 'AK',
      Arizona: 'AZ',
      Arkansas: 'AR',
      California: 'CA',
      Colorado: 'CO',
      Connecticut: 'CT',
      Delaware: 'DE',
      'District of Columbia': 'DC',
      Florida: 'FL',
      Georgia: 'GA',
      Hawaii: 'HI',
      Idaho: 'ID',
      Illinois: 'IL',
      Indiana: 'IN',
      Iowa: 'IA',
      Kansas: 'KS',
      Kentucky: 'KY',
      Louisiana: 'LA',
      Maine: 'ME',
      Maryland: 'MD',
      Massachusetts: 'MA',
      Michigan: 'MI',
      Minnesota: 'MN',
      Mississippi: 'MS',
      Missouri: 'MO',
      Montana: 'MT',
      Nebraska: 'NE',
      Nevada: 'NV',
      'New Hampshire': 'NH',
      'New Jersey': 'NJ',
      'New Mexico': 'NM',
      'New York': 'NY',
      'North Carolina': 'NC',
      'North Dakota': 'ND',
      Ohio: 'OH',
      Oklahoma: 'OK',
      Oregon: 'OR',
      Pennsylvania: 'PA',
      'Rhode Island': 'RI',
      'South Carolina': 'SC',
      'South Dakota': 'SD',
      Tennessee: 'TN',
      Texas: 'TX',
      Utah: 'UT',
      Vermont: 'VT',
      Virginia: 'VA',
      Washington: 'WA',
      'West Virginia': 'WV',
      Wisconsin: 'WI',
      Wyoming: 'WY',
      'Puerto Rico': 'PR',
      'Virgin Islands': 'VI',
      Guam: 'GU',
      'Northern Mariana Islands': 'MP',
      'American Samoa': 'AS',
    };

    return stateMap[stateName] ?? stateName.substring(0, 2).toUpperCase();
  }

  /**
   * Clear tile cache
   */
  clearTileCache(): void {
    this.tileCache.clear();
  }

  /**
   * Get tile cache statistics
   */
  getTileCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return this.tileCache.getStats();
  }
}

// Export singleton instance
export const mapService = new MapService();

