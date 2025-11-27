/**
 * HUBZone Map Data Loader Service
 *
 * Comprehensive service for loading, processing, and importing HUBZone map data
 * from various sources including Census TIGER/Line shapefiles, SBA API,
 * and Census ACS data.
 *
 * Features:
 * - Download Census tract boundaries (TIGER/Line shapefiles)
 * - Download SBA HUBZone designations
 * - Calculate Qualified Census Tracts (QCTs) from Census ACS data
 * - Identify redesignated areas
 * - Merge geography with designations
 * - Import into PostGIS database
 * - Notify affected businesses
 */

import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { readdir, readFile, writeFile, rm } from 'fs/promises';
import { execSync, spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { join, basename, dirname } from 'path';
import { Readable } from 'stream';

import { db } from './database.js';
import { alertService } from './alertService.js';

import type { PoolClient } from 'pg';
import type {
  TractFeature,
  TractProperties,
  FeatureCollection,
  CacheMetadata,
  HUBZoneDesignation,
  QCTCriteria,
  CensusACSData,
  RedesignatedArea,
  MapImportResult,
  ImportStatistics,
  ImportError,
  ImportWarning,
  DownloadProgress,
  DownloadProgressCallback,
  HUBZoneMapUpdate,
  AffectedBusiness,
  HUBZoneMapLoaderConfig,
} from '../types/hubzoneMapLoader.js';

import {
  DEFAULT_LOADER_CONFIG,
  STATE_FIPS_CODES,
  QCT_THRESHOLDS,
  CENSUS_ACS_VARIABLES,
} from '../types/hubzoneMapLoader.js';

import type { HubzoneType, HubzoneStatus } from '../types/hubzone.js';

/**
 * HUBZone Map Loader Service
 *
 * Manages the complete lifecycle of HUBZone map data updates including
 * downloading, processing, importing, and notification of affected parties.
 */
export class HUBZoneMapLoaderService {
  private config: HUBZoneMapLoaderConfig;
  private progressCallback?: DownloadProgressCallback;

  constructor(config: Partial<HUBZoneMapLoaderConfig> = {}) {
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
    this.ensureCacheDirectory();
  }

  /**
   * Set progress callback for download/processing updates
   */
  setProgressCallback(callback: DownloadProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Main method: Load the latest HUBZone map data
   *
   * This orchestrates the complete update process:
   * 1. Download Census tract boundaries (TIGER/Line shapefiles)
   * 2. Download SBA HUBZone designations
   * 3. Calculate QCTs from Census ACS data
   * 4. Identify redesignated areas
   * 5. Merge geography with designations
   * 6. Import into PostGIS database
   * 7. Notify affected businesses
   */
  async loadLatestHUBZoneMap(): Promise<MapImportResult> {
    const startTime = Date.now();
    const importId = this.generateImportId();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    console.info(`[HUBZone Loader] Starting map data import: ${importId}`);

    try {
      // Create import record
      await this.createMapUpdateRecord(importId, 'in_progress');

      // Step 1: Download Census tract boundaries
      console.info('[HUBZone Loader] Step 1/6: Downloading Census tract boundaries...');
      const tractFeatures = await this.ensureCensusTractBoundaries();
      console.info(`[HUBZone Loader] Downloaded ${tractFeatures.length} tract features`);

      // Step 2: Download HUBZone designations from SBA
      console.info('[HUBZone Loader] Step 2/6: Downloading HUBZone designations...');
      const designations = await this.downloadHUBZoneDesignations();
      console.info(`[HUBZone Loader] Retrieved ${designations.length} designations`);

      // Step 3: Calculate QCTs from Census ACS data
      console.info('[HUBZone Loader] Step 3/6: Calculating QCTs from Census data...');
      const qctTracts = await this.calculateQCTsFromCensus();
      console.info(`[HUBZone Loader] Identified ${qctTracts.length} qualified census tracts`);

      // Step 4: Identify redesignated areas
      console.info('[HUBZone Loader] Step 4/6: Identifying redesignated areas...');
      const redesignatedAreas = await this.identifyRedesignatedAreas(designations);
      console.info(`[HUBZone Loader] Found ${redesignatedAreas.length} redesignated areas`);

      // Step 5: Merge geography with designations
      console.info('[HUBZone Loader] Step 5/6: Merging geography with designations...');
      const mergedDesignations = this.mergeGeographyWithDesignations(
        tractFeatures,
        designations,
        qctTracts,
        redesignatedAreas
      );
      console.info(`[HUBZone Loader] Merged ${mergedDesignations.length} total designations`);

      // Step 6: Import to database
      console.info('[HUBZone Loader] Step 6/6: Importing to PostGIS database...');
      const importStats = await this.importToDatabase(importId, mergedDesignations, tractFeatures);

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      importStats.processingTimeMs = processingTimeMs;

      // Update import record
      await this.updateMapUpdateRecord(importId, 'completed', importStats);

      // Notify affected businesses (if not dry run)
      let affectedBusinessCount = 0;
      if (this.config.enableNotifications && !this.config.dryRun) {
        console.info('[HUBZone Loader] Notifying affected businesses...');
        affectedBusinessCount = await this.notifyAffectedBusinesses(importId);
        console.info(`[HUBZone Loader] Notified ${affectedBusinessCount} affected businesses`);
      }

      console.info(`[HUBZone Loader] Import completed successfully in ${processingTimeMs}ms`);

      return {
        success: true,
        importId,
        importedAt: new Date(),
        statistics: importStats,
        errors,
        warnings,
        affectedBusinessCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[HUBZone Loader] Import failed: ${errorMessage}`);

      errors.push({
        code: 'IMPORT_FAILED',
        message: errorMessage,
        severity: 'fatal',
        timestamp: new Date(),
      });

      await this.updateMapUpdateRecord(importId, 'failed', undefined, errorMessage);

      return {
        success: false,
        importId,
        importedAt: new Date(),
        statistics: {
          totalTracts: 0,
          newDesignations: 0,
          updatedDesignations: 0,
          expiredDesignations: 0,
          redesignatedAreas: 0,
          activeHubzones: 0,
          processingTimeMs: Date.now() - startTime,
        },
        errors,
        warnings,
        affectedBusinessCount: 0,
      };
    }
  }

  /**
   * Ensure Census tract boundaries are available
   *
   * Downloads state-by-state tract files from Census TIGER/Line API.
   * Uses local cache with 90-day expiration.
   * Converts shapefiles to GeoJSON with ogr2ogr.
   *
   * @returns Array of tract features
   */
  async ensureCensusTractBoundaries(): Promise<TractFeature[]> {
    const allFeatures: TractFeature[] = [];
    const year = new Date().getFullYear();

    for (let i = 0; i < STATE_FIPS_CODES.length; i++) {
      const state = STATE_FIPS_CODES[i];

      this.reportProgress({
        stage: 'downloading',
        currentState: state.name,
        statesCompleted: i,
        totalStates: STATE_FIPS_CODES.length,
        bytesDownloaded: 0,
        totalBytes: 0,
        percentComplete: Math.round((i / STATE_FIPS_CODES.length) * 100),
      });

      try {
        const features = await this.downloadStateTracts(state.fips, year);
        allFeatures.push(...features);
      } catch (error) {
        console.warn(
          `[HUBZone Loader] Failed to download tracts for ${state.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        // Continue with other states
      }
    }

    return allFeatures;
  }

  /**
   * Download tract boundaries for a single state
   */
  private async downloadStateTracts(stateFips: string, year: number): Promise<TractFeature[]> {
    const cacheKey = `tracts_${stateFips}_${year}`;
    const cachedData = await this.getCachedData<FeatureCollection>(cacheKey);

    if (cachedData) {
      return cachedData.features;
    }

    // Download from Census TIGER/Line
    const zipFileName = `tl_${year}_${stateFips}_tract.zip`;
    const downloadUrl = `${this.config.tigerLineBaseUrl}/TIGER${year}/TRACT/${zipFileName}`;
    const zipPath = join(this.config.cacheDirectory, zipFileName);
    const extractDir = join(this.config.cacheDirectory, `tract_${stateFips}_${year}`);
    const geoJsonPath = join(this.config.cacheDirectory, `${cacheKey}.geojson`);

    // Download zip file
    await this.downloadFile(downloadUrl, zipPath);

    // Extract zip file
    await this.extractZipFile(zipPath, extractDir);

    // Find the shapefile
    const shpFile = await this.findShapefile(extractDir);

    // Convert to GeoJSON using ogr2ogr
    await this.convertShapefileToGeoJson(shpFile, geoJsonPath);

    // Read and parse GeoJSON
    const geoJsonContent = await readFile(geoJsonPath, 'utf-8');
    const featureCollection = JSON.parse(geoJsonContent) as FeatureCollection;

    // Cache the result
    await this.setCachedData(cacheKey, featureCollection);

    // Cleanup temporary files
    await this.cleanupTempFiles([zipPath, extractDir]);

    return featureCollection.features;
  }

  /**
   * Download HUBZone designations from SBA
   *
   * Tries SBA API first, falls back to public datasets.
   * Calculates QCTs from ACS data and identifies redesignated areas.
   * Deduplicates designations by GEOID.
   *
   * @returns Array of HUBZone designations
   */
  async downloadHUBZoneDesignations(): Promise<HUBZoneDesignation[]> {
    const designations: HUBZoneDesignation[] = [];

    // Try SBA API first
    try {
      const sbaDesignations = await this.fetchFromSBAApi();
      designations.push(...sbaDesignations);
      console.info(`[HUBZone Loader] Retrieved ${sbaDesignations.length} designations from SBA API`);
    } catch (error) {
      console.warn(
        `[HUBZone Loader] SBA API failed, falling back to public datasets: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Fallback to public datasets
      const publicDesignations = await this.fetchFromPublicDatasets();
      designations.push(...publicDesignations);
    }

    // Deduplicate by GEOID
    const deduplicatedDesignations = this.deduplicateDesignations(designations);

    return deduplicatedDesignations;
  }

  /**
   * Fetch HUBZone designations from SBA API
   */
  private async fetchFromSBAApi(): Promise<HUBZoneDesignation[]> {
    const designations: HUBZoneDesignation[] = [];
    let page = 1;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.config.sbaApiEndpoint}/designations?page=${page}&pageSize=${pageSize}`;
      const response = await this.fetchWithRetry(url);

      if (!response.ok) {
        throw new Error(`SBA API returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        designations: Array<{
          geoid: string;
          tract_id: string;
          state: string;
          county: string;
          type: string;
          status: string;
          designation_date: string;
          expiration_date?: string;
          is_redesignated?: boolean;
          grace_period_end_date?: string;
        }>;
        pagination: { hasMore: boolean };
      };

      for (const item of data.designations) {
        designations.push({
          geoid: item.geoid,
          tractId: item.tract_id,
          state: item.state,
          county: item.county,
          designationType: this.mapDesignationType(item.type),
          status: this.mapDesignationStatus(item.status),
          designationDate: new Date(item.designation_date),
          expirationDate: item.expiration_date ? new Date(item.expiration_date) : null,
          isRedesignated: item.is_redesignated ?? false,
          gracePeriodEndDate: item.grace_period_end_date
            ? new Date(item.grace_period_end_date)
            : null,
          sourceDataset: 'sba_api',
        });
      }

      hasMore = data.pagination.hasMore;
      page++;
    }

    return designations;
  }

  /**
   * Fetch HUBZone designations from public datasets
   */
  private async fetchFromPublicDatasets(): Promise<HUBZoneDesignation[]> {
    const designations: HUBZoneDesignation[] = [];

    // Try multiple public data sources
    const sources = [
      'https://data.sba.gov/dataset/hubzone-qualified-areas/resource/hubzone-qct.csv',
      'https://data.sba.gov/dataset/hubzone-qualified-areas/resource/hubzone-qnmc.csv',
      'https://data.sba.gov/dataset/hubzone-qualified-areas/resource/hubzone-indian-lands.csv',
    ];

    for (const sourceUrl of sources) {
      try {
        const response = await this.fetchWithRetry(sourceUrl);
        if (response.ok) {
          const csvData = await response.text();
          const parsed = this.parseCSVDesignations(csvData);
          designations.push(...parsed);
        }
      } catch (error) {
        console.warn(
          `[HUBZone Loader] Failed to fetch from ${sourceUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return designations;
  }

  /**
   * Parse CSV designation data
   */
  private parseCSVDesignations(csvData: string): HUBZoneDesignation[] {
    const designations: HUBZoneDesignation[] = [];
    const lines = csvData.split('\n');

    if (lines.length < 2) return designations;

    // Parse header
    const headerLine = lines[0];
    if (!headerLine) return designations;
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

    const geoidIdx = headers.indexOf('geoid');
    const stateIdx = headers.indexOf('state');
    const countyIdx = headers.indexOf('county');
    const typeIdx = headers.indexOf('type');
    const statusIdx = headers.indexOf('status');
    const dateIdx = headers.indexOf('designation_date');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line?.trim()) continue;

      const values = line.split(',').map((v) => v.trim());

      designations.push({
        geoid: values[geoidIdx] ?? '',
        tractId: values[geoidIdx]?.slice(-6) ?? '',
        state: values[stateIdx] ?? '',
        county: values[countyIdx] ?? '',
        designationType: this.mapDesignationType(values[typeIdx] ?? 'qct'),
        status: this.mapDesignationStatus(values[statusIdx] ?? 'active'),
        designationDate: new Date(values[dateIdx] ?? Date.now()),
        expirationDate: null,
        isRedesignated: false,
        gracePeriodEndDate: null,
        sourceDataset: 'public_dataset',
      });
    }

    return designations;
  }

  /**
   * Calculate Qualified Census Tracts from Census ACS data
   *
   * Queries Census API for income/poverty data and applies QCT criteria:
   * - Poverty rate >= 25%, OR
   * - Median income <= 80% of area median
   *
   * @returns Array of qualified tract GEOIDs
   */
  async calculateQCTsFromCensus(): Promise<string[]> {
    const qualifiedTracts: string[] = [];
    const year = new Date().getFullYear() - 1; // Use previous year's ACS data

    for (const state of STATE_FIPS_CODES) {
      try {
        const acsData = await this.fetchCensusACSData(state.fips, year);

        for (const tract of acsData) {
          const criteria = this.evaluateQCTCriteria(tract);

          if (criteria.isQualified) {
            qualifiedTracts.push(tract.geoid);
          }
        }
      } catch (error) {
        console.warn(
          `[HUBZone Loader] Failed to fetch ACS data for ${state.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return qualifiedTracts;
  }

  /**
   * Fetch Census ACS data for a state
   */
  private async fetchCensusACSData(stateFips: string, year: number): Promise<CensusACSData[]> {
    const cacheKey = `acs_${stateFips}_${year}`;
    const cachedData = await this.getCachedData<CensusACSData[]>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const variables = Object.values(CENSUS_ACS_VARIABLES).join(',');
    const apiKey = this.config.censusApiKey ? `&key=${this.config.censusApiKey}` : '';
    const url = `${this.config.censusAcsBaseUrl}/${year}/acs/acs5?get=${variables}&for=tract:*&in=state:${stateFips}${apiKey}`;

    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Census API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as string[][];

    // First row is headers
    const acsData: CensusACSData[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 7) continue;

      const totalPop = parseInt(row[0] ?? '0', 10);
      const povertyUniverse = parseInt(row[1] ?? '0', 10);
      const povertyBelow = parseInt(row[2] ?? '0', 10);
      const medianHouseholdIncome = parseInt(row[3] ?? '0', 10);
      const medianFamilyIncome = parseInt(row[4] ?? '0', 10);
      const stateCode = row[5] ?? '';
      const countyCode = row[6] ?? '';
      const tractCode = row[7] ?? '';

      const povertyRate = povertyUniverse > 0 ? (povertyBelow / povertyUniverse) * 100 : 0;

      acsData.push({
        geoid: `${stateCode}${countyCode}${tractCode}`,
        state: stateCode,
        county: countyCode,
        tract: tractCode,
        totalPopulation: totalPop,
        povertyPopulation: povertyBelow,
        povertyRate,
        medianHouseholdIncome,
        medianFamilyIncome,
        areaMedianIncome: 0, // Will be calculated separately
        year,
      });
    }

    // Calculate area median income for each county
    const acsDataWithAMI = await this.addAreaMedianIncome(acsData, stateFips, year);

    await this.setCachedData(cacheKey, acsDataWithAMI);

    return acsDataWithAMI;
  }

  /**
   * Add area median income to ACS data
   */
  private async addAreaMedianIncome(
    acsData: CensusACSData[],
    _stateFips: string,
    _year: number
  ): Promise<CensusACSData[]> {
    // Group by county to calculate county-level median
    const countyGroups = new Map<string, CensusACSData[]>();

    for (const tract of acsData) {
      const countyKey = `${tract.state}${tract.county}`;
      if (!countyGroups.has(countyKey)) {
        countyGroups.set(countyKey, []);
      }
      countyGroups.get(countyKey)?.push(tract);
    }

    // Calculate area median for each county
    for (const [, tracts] of countyGroups) {
      const incomes = tracts
        .map((t) => t.medianHouseholdIncome)
        .filter((i) => i > 0)
        .sort((a, b) => a - b);

      const medianIndex = Math.floor(incomes.length / 2);
      const areaMedian = incomes[medianIndex] ?? 0;

      for (const tract of tracts) {
        tract.areaMedianIncome = areaMedian;
      }
    }

    return acsData;
  }

  /**
   * Evaluate QCT criteria for a tract
   */
  private evaluateQCTCriteria(tract: CensusACSData): QCTCriteria {
    const qualifiesByPoverty = tract.povertyRate >= QCT_THRESHOLDS.POVERTY_RATE_MINIMUM;

    const incomeRatio =
      tract.areaMedianIncome > 0 ? tract.medianHouseholdIncome / tract.areaMedianIncome : 1;

    const qualifiesByIncome = incomeRatio <= QCT_THRESHOLDS.INCOME_RATIO_MAXIMUM;

    return {
      povertyRate: tract.povertyRate,
      medianIncome: tract.medianHouseholdIncome,
      areaMedianIncome: tract.areaMedianIncome,
      qualifiesByPoverty,
      qualifiesByIncome,
      isQualified: qualifiesByPoverty || qualifiesByIncome,
    };
  }

  /**
   * Identify redesignated areas
   */
  async identifyRedesignatedAreas(
    designations: HUBZoneDesignation[]
  ): Promise<RedesignatedArea[]> {
    const redesignatedAreas: RedesignatedArea[] = [];

    // Query existing designations from database
    const existingQuery = `
      SELECT 
        geoid,
        zone_type,
        designation_date,
        status,
        expiration_date
      FROM hubzones
      WHERE status = 'active'
    `;

    const existingResult = await db.query<{
      geoid: string;
      zone_type: HubzoneType;
      designation_date: Date;
      status: HubzoneStatus;
      expiration_date: Date | null;
    }>(existingQuery);

    const existingByGeoid = new Map(existingResult.rows.map((row) => [row.geoid, row]));

    // Find areas that are no longer in the new designations
    const newGeoids = new Set(designations.map((d) => d.geoid));

    for (const [geoid, existing] of existingByGeoid) {
      if (!newGeoids.has(geoid)) {
        // This area has been redesignated (no longer qualifies)
        const gracePeriodEndDate = new Date();
        gracePeriodEndDate.setFullYear(gracePeriodEndDate.getFullYear() + 3); // 3-year grace period

        redesignatedAreas.push({
          geoid,
          originalDesignationDate: existing.designation_date,
          redesignationDate: new Date(),
          gracePeriodEndDate,
          previousType: existing.zone_type,
          reason: 'income_threshold_exceeded',
        });
      }
    }

    return redesignatedAreas;
  }

  /**
   * Merge geography with designations
   */
  private mergeGeographyWithDesignations(
    tractFeatures: TractFeature[],
    designations: HUBZoneDesignation[],
    qctTracts: string[],
    redesignatedAreas: RedesignatedArea[]
  ): HUBZoneDesignation[] {
    const mergedDesignations: HUBZoneDesignation[] = [...designations];
    const existingGeoids = new Set(designations.map((d) => d.geoid));
    const redesignatedGeoids = new Set(redesignatedAreas.map((r) => r.geoid));

    // Add QCT-qualified tracts that aren't already in designations
    for (const tractGeoid of qctTracts) {
      if (!existingGeoids.has(tractGeoid)) {
        const tractFeature = tractFeatures.find((f) => f.properties.GEOID === tractGeoid);
        if (tractFeature) {
          mergedDesignations.push({
            geoid: tractGeoid,
            tractId: tractFeature.properties.TRACTCE,
            state: tractFeature.properties.STATEFP,
            county: tractFeature.properties.COUNTYFP,
            designationType: 'qualified_census_tract',
            status: 'active',
            designationDate: new Date(),
            expirationDate: null,
            isRedesignated: false,
            gracePeriodEndDate: null,
            sourceDataset: 'census_acs',
          });
        }
      }
    }

    // Mark redesignated areas
    for (const designation of mergedDesignations) {
      if (redesignatedGeoids.has(designation.geoid)) {
        const redesignation = redesignatedAreas.find((r) => r.geoid === designation.geoid);
        if (redesignation) {
          designation.isRedesignated = true;
          designation.status = 'redesignated';
          designation.gracePeriodEndDate = redesignation.gracePeriodEndDate;
        }
      }
    }

    return mergedDesignations;
  }

  /**
   * Import designations and geography to PostGIS database
   *
   * Uses a transaction for atomicity:
   * 1. Begin transaction
   * 2. Batch insert designations
   * 3. Update hubzone_map_updates table
   * 4. Commit transaction
   *
   * @returns Import statistics
   */
  async importToDatabase(
    importId: string,
    designations: HUBZoneDesignation[],
    tractFeatures: TractFeature[]
  ): Promise<ImportStatistics> {
    if (this.config.dryRun) {
      console.info('[HUBZone Loader] Dry run mode - skipping database import');
      return {
        totalTracts: tractFeatures.length,
        newDesignations: designations.length,
        updatedDesignations: 0,
        expiredDesignations: 0,
        redesignatedAreas: designations.filter((d) => d.isRedesignated).length,
        activeHubzones: designations.filter((d) => d.status === 'active').length,
        processingTimeMs: 0,
      };
    }

    const tractMap = new Map(tractFeatures.map((f) => [f.properties.GEOID, f]));

    let newCount = 0;
    let updatedCount = 0;
    let expiredCount = 0;

    await db.transaction(async (client: PoolClient) => {
      // Get existing designations
      const existingQuery = 'SELECT geoid FROM hubzones';
      const existingResult = await client.query<{ geoid: string }>(existingQuery);
      const existingGeoids = new Set(existingResult.rows.map((r) => r.geoid));

      // Process in batches
      for (let i = 0; i < designations.length; i += this.config.batchSize) {
        const batch = designations.slice(i, i + this.config.batchSize);

        for (const designation of batch) {
          const tract = tractMap.get(designation.geoid);
          const geometry = tract?.geometry;

          if (existingGeoids.has(designation.geoid)) {
            // Update existing
            await this.updateDesignation(client, designation, geometry);
            updatedCount++;
          } else {
            // Insert new
            await this.insertDesignation(client, designation, geometry);
            newCount++;
          }
        }
      }

      // Expire old designations not in the new set
      const newGeoids = new Set(designations.map((d) => d.geoid));
      for (const existingGeoid of existingGeoids) {
        if (!newGeoids.has(existingGeoid)) {
          await this.expireDesignation(client, existingGeoid);
          expiredCount++;
        }
      }

      // Log import completion
      await client.query(
        `INSERT INTO hubzone_import_logs (import_id, completed_at, new_count, updated_count, expired_count)
         VALUES ($1, NOW(), $2, $3, $4)`,
        [importId, newCount, updatedCount, expiredCount]
      );
    });

    return {
      totalTracts: tractFeatures.length,
      newDesignations: newCount,
      updatedDesignations: updatedCount,
      expiredDesignations: expiredCount,
      redesignatedAreas: designations.filter((d) => d.isRedesignated).length,
      activeHubzones: designations.filter((d) => d.status === 'active').length,
      processingTimeMs: 0,
    };
  }

  /**
   * Insert a new designation
   */
  private async insertDesignation(
    client: PoolClient,
    designation: HUBZoneDesignation,
    geometry: TractFeature['geometry'] | undefined
  ): Promise<void> {
    const stateName =
      STATE_FIPS_CODES.find((s) => s.fips === designation.state)?.name ?? designation.state;

    const query = `
      INSERT INTO hubzones (
        id, name, zone_type, state, county, geoid,
        designation_date, expiration_date, status,
        is_redesignated, grace_period_end_date,
        geometry, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        ${geometry ? 'ST_SetSRID(ST_GeomFromGeoJSON($11), 4326)' : 'NULL'},
        NOW(), NOW()
      )
    `;

    const params: unknown[] = [
      `Census Tract ${designation.tractId}`,
      designation.designationType,
      stateName,
      designation.county,
      designation.geoid,
      designation.designationDate,
      designation.expirationDate,
      designation.status,
      designation.isRedesignated,
      designation.gracePeriodEndDate,
    ];

    if (geometry) {
      params.push(JSON.stringify(geometry));
    }

    await client.query(query, params);
  }

  /**
   * Update an existing designation
   */
  private async updateDesignation(
    client: PoolClient,
    designation: HUBZoneDesignation,
    geometry: TractFeature['geometry'] | undefined
  ): Promise<void> {
    const query = `
      UPDATE hubzones SET
        zone_type = $1,
        designation_date = $2,
        expiration_date = $3,
        status = $4,
        is_redesignated = $5,
        grace_period_end_date = $6,
        ${geometry ? 'geometry = ST_SetSRID(ST_GeomFromGeoJSON($8), 4326),' : ''}
        updated_at = NOW()
      WHERE geoid = $7
    `;

    const params: unknown[] = [
      designation.designationType,
      designation.designationDate,
      designation.expirationDate,
      designation.status,
      designation.isRedesignated,
      designation.gracePeriodEndDate,
      designation.geoid,
    ];

    if (geometry) {
      params.push(JSON.stringify(geometry));
    }

    await client.query(query, params);
  }

  /**
   * Expire a designation
   */
  private async expireDesignation(client: PoolClient, geoid: string): Promise<void> {
    await client.query(
      `UPDATE hubzones SET status = 'expired', expiration_date = NOW(), updated_at = NOW() WHERE geoid = $1`,
      [geoid]
    );
  }

  /**
   * Notify affected businesses
   *
   * Finds businesses with changed HUBZone status and generates compliance alerts.
   *
   * @returns Number of affected businesses notified
   */
  async notifyAffectedBusinesses(importId: string): Promise<number> {
    // Find businesses affected by the import
    const affectedQuery = `
      SELECT 
        b.id as business_id,
        b.name as business_name,
        b.principal_office_address,
        CASE 
          WHEN h_old.id IS NOT NULL AND h_new.id IS NULL THEN 'lost_hubzone'
          WHEN h_old.id IS NULL AND h_new.id IS NOT NULL THEN 'gained_hubzone'
          WHEN h_new.status = 'redesignated' THEN 'hubzone_redesignated'
          ELSE NULL
        END as change_type,
        h_new.geoid as affected_geoid,
        COALESCE(h_new.name, h_old.name) as hubzone_name,
        h_new.grace_period_end_date
      FROM businesses b
      LEFT JOIN LATERAL (
        SELECT hz.* FROM hubzones hz
        WHERE ST_Contains(hz.geometry, ST_SetSRID(ST_MakePoint(
          (b.principal_office_lon)::float, 
          (b.principal_office_lat)::float
        ), 4326))
        AND hz.status = 'active'
        AND hz.updated_at < (SELECT started_at FROM hubzone_map_updates WHERE import_id = $1)
        LIMIT 1
      ) h_old ON true
      LEFT JOIN LATERAL (
        SELECT hz.* FROM hubzones hz
        WHERE ST_Contains(hz.geometry, ST_SetSRID(ST_MakePoint(
          (b.principal_office_lon)::float, 
          (b.principal_office_lat)::float
        ), 4326))
        AND hz.status IN ('active', 'redesignated')
        AND hz.updated_at >= (SELECT started_at FROM hubzone_map_updates WHERE import_id = $1)
        LIMIT 1
      ) h_new ON true
      WHERE (h_old.id IS NOT NULL AND h_new.id IS NULL)
         OR (h_old.id IS NULL AND h_new.id IS NOT NULL)
         OR (h_new.status = 'redesignated')
    `;

    const result = await db.query<{
      business_id: string;
      business_name: string;
      change_type: AffectedBusiness['changeType'];
      affected_geoid: string;
      hubzone_name: string;
      grace_period_end_date: Date | null;
    }>(affectedQuery, [importId]);

    let notifiedCount = 0;

    for (const row of result.rows) {
      if (!row.change_type) continue;

      try {
        // Generate appropriate alert based on change type
        await this.generateHubzoneChangeAlert(
          row.business_id,
          row.business_name,
          row.change_type,
          row.hubzone_name,
          row.grace_period_end_date
        );

        // Record notification
        await db.query(
          `INSERT INTO hubzone_change_notifications (
            business_id, import_id, change_type, affected_geoid,
            hubzone_name, grace_period_end_date, notified_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            row.business_id,
            importId,
            row.change_type,
            row.affected_geoid,
            row.hubzone_name,
            row.grace_period_end_date,
          ]
        );

        notifiedCount++;
      } catch (error) {
        console.error(
          `[HUBZone Loader] Failed to notify business ${row.business_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return notifiedCount;
  }

  /**
   * Generate alert for HUBZone change
   */
  private async generateHubzoneChangeAlert(
    businessId: string,
    businessName: string,
    changeType: AffectedBusiness['changeType'],
    hubzoneName: string,
    gracePeriodEndDate: Date | null
  ): Promise<void> {
    let title: string;
    let message: string;
    let severity: 'low' | 'medium' | 'high' | 'critical';
    let actionRequired: string;

    switch (changeType) {
      case 'lost_hubzone':
        title = 'CRITICAL: Principal Office No Longer in HUBZone';
        message = `Your principal office location is no longer within a designated HUBZone (${hubzoneName}). This affects your HUBZone certification status.`;
        severity = 'critical';
        actionRequired =
          'Review your HUBZone certification status immediately. You may need to relocate your principal office to maintain certification.';
        break;

      case 'gained_hubzone':
        title = 'Good News: Location Now in HUBZone';
        message = `Your principal office location is now within a designated HUBZone (${hubzoneName}). You may be eligible for HUBZone benefits.`;
        severity = 'low';
        actionRequired =
          'Review your eligibility for HUBZone certification if you are not already certified.';
        break;

      case 'hubzone_redesignated':
        const daysRemaining = gracePeriodEndDate
          ? Math.ceil((gracePeriodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        title = 'HUBZone Redesignated - Grace Period Active';
        message = `The HUBZone (${hubzoneName}) where your principal office is located has been redesignated. You have a grace period of ${daysRemaining} days to maintain compliance.`;
        severity = daysRemaining <= 180 ? 'high' : 'medium';
        actionRequired = `Plan for potential relocation before the grace period ends on ${gracePeriodEndDate?.toLocaleDateString() ?? 'unknown date'}.`;
        break;

      default:
        return;
    }

    // Use the alert service to generate and send alerts
    await alertService.generateAlerts(businessId);

    // Also create a direct hubzone-specific alert
    await db.query(
      `INSERT INTO compliance_alerts (
        business_id, type, severity, status, title, message,
        details, action_required, created_at, updated_at
      ) VALUES ($1, 'principal_office', $2, 'active', $3, $4, $5, $6, NOW(), NOW())`,
      [
        businessId,
        severity,
        title,
        message,
        JSON.stringify({
          hubzoneName,
          changeType,
          gracePeriodEndDate: gracePeriodEndDate?.toISOString(),
        }),
        actionRequired,
      ]
    );
  }

  // ===== Utility Methods =====

  /**
   * Deduplicate designations by GEOID
   */
  private deduplicateDesignations(designations: HUBZoneDesignation[]): HUBZoneDesignation[] {
    const seen = new Map<string, HUBZoneDesignation>();

    for (const designation of designations) {
      const existing = seen.get(designation.geoid);

      if (
        !existing ||
        designation.sourceDataset === 'sba_api' ||
        designation.designationDate > existing.designationDate
      ) {
        seen.set(designation.geoid, designation);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Map designation type string to enum
   */
  private mapDesignationType(type: string): HubzoneType {
    const typeMap: Record<string, HubzoneType> = {
      qct: 'qualified_census_tract',
      qualified_census_tract: 'qualified_census_tract',
      qnmc: 'qualified_non_metro_county',
      qualified_non_metro_county: 'qualified_non_metro_county',
      indian_lands: 'indian_lands',
      base_closure: 'base_closure_area',
      base_closure_area: 'base_closure_area',
      governor_designated: 'governor_designated',
      redesignated: 'redesignated',
    };

    return typeMap[type.toLowerCase()] ?? 'qualified_census_tract';
  }

  /**
   * Map designation status string to enum
   */
  private mapDesignationStatus(status: string): HubzoneStatus {
    const statusMap: Record<string, HubzoneStatus> = {
      active: 'active',
      expired: 'expired',
      pending: 'pending',
      redesignated: 'redesignated',
    };

    return statusMap[status.toLowerCase()] ?? 'active';
  }

  /**
   * Generate unique import ID
   */
  private generateImportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `imp_${timestamp}_${random}`;
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    if (!existsSync(this.config.cacheDirectory)) {
      mkdirSync(this.config.cacheDirectory, { recursive: true });
    }
  }

  /**
   * Get cached data if valid
   */
  private async getCachedData<T>(key: string): Promise<T | null> {
    const metadataPath = join(this.config.cacheDirectory, `${key}.meta.json`);
    const dataPath = join(this.config.cacheDirectory, `${key}.json`);

    if (!existsSync(metadataPath) || !existsSync(dataPath)) {
      return null;
    }

    try {
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8')) as CacheMetadata;

      if (new Date(metadata.expiresAt) < new Date()) {
        // Cache expired
        return null;
      }

      const data = JSON.parse(await readFile(dataPath, 'utf-8')) as T;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Set cached data
   */
  private async setCachedData<T>(key: string, data: T): Promise<void> {
    const metadataPath = join(this.config.cacheDirectory, `${key}.meta.json`);
    const dataPath = join(this.config.cacheDirectory, `${key}.json`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.config.cacheDurationDays);

    const metadata: CacheMetadata = {
      filePath: dataPath,
      downloadedAt: new Date(),
      expiresAt,
      sourceUrl: '',
      fileSize: 0,
    };

    const dataString = JSON.stringify(data);
    metadata.fileSize = dataString.length;

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    await writeFile(dataPath, dataString);
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await this.fetchWithRetry(url);

    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status}`);
    }

    const fileStream = createWriteStream(destPath);
    const body = response.body as unknown;

    if (body && typeof (body as { pipe?: unknown }).pipe === 'function') {
      await pipeline(body as NodeJS.ReadableStream, fileStream);
    } else {
      const buffer = await response.arrayBuffer();
      await pipeline(Readable.from(Buffer.from(buffer)), fileStream);
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        return response;
      } catch (error) {
        lastError = error as Error;
        await this.delay(this.config.retryDelayMs * (attempt + 1));
      }
    }

    throw lastError ?? new Error('Fetch failed');
  }

  /**
   * Extract zip file
   */
  private async extractZipFile(zipPath: string, destDir: string): Promise<void> {
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    // Use system unzip command (cross-platform compatible)
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`);
    } else {
      execSync(`unzip -o "${zipPath}" -d "${destDir}"`);
    }
  }

  /**
   * Find shapefile in directory
   */
  private async findShapefile(dir: string): Promise<string> {
    const files = await readdir(dir, { recursive: true });
    const shpFile = files.find((f) => f.toString().endsWith('.shp'));

    if (!shpFile) {
      throw new Error(`No shapefile found in ${dir}`);
    }

    return join(dir, shpFile.toString());
  }

  /**
   * Convert shapefile to GeoJSON using ogr2ogr
   */
  private async convertShapefileToGeoJson(shpPath: string, geoJsonPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ogr2ogr = spawn('ogr2ogr', ['-f', 'GeoJSON', geoJsonPath, shpPath]);

      ogr2ogr.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ogr2ogr exited with code ${code}`));
        }
      });

      ogr2ogr.on('error', (err) => {
        reject(new Error(`Failed to run ogr2ogr: ${err.message}`));
      });
    });
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        if (existsSync(path)) {
          const stats = statSync(path);
          if (stats.isDirectory()) {
            await rm(path, { recursive: true, force: true });
          } else {
            unlinkSync(path);
          }
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Report progress
   */
  private reportProgress(progress: DownloadProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create map update record
   */
  private async createMapUpdateRecord(importId: string, status: string): Promise<void> {
    await db.query(
      `INSERT INTO hubzone_map_updates (
        import_id, source_type, source_version, started_at, status
      ) VALUES ($1, 'tiger_line', $2, NOW(), $3)`,
      [importId, new Date().getFullYear().toString(), status]
    );
  }

  /**
   * Update map update record
   */
  private async updateMapUpdateRecord(
    importId: string,
    status: string,
    statistics?: ImportStatistics,
    errorMessage?: string
  ): Promise<void> {
    await db.query(
      `UPDATE hubzone_map_updates SET
        status = $2,
        completed_at = NOW(),
        statistics = $3,
        error_message = $4,
        updated_at = NOW()
      WHERE import_id = $1`,
      [importId, status, statistics ? JSON.stringify(statistics) : null, errorMessage ?? null]
    );
  }
}

// Export singleton instance
export const hubzoneMapLoaderService = new HUBZoneMapLoaderService();

// Export class for custom configuration
export { HUBZoneMapLoaderService };

