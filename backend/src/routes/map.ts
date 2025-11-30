/**
 * Map Routes
 *
 * Vector tile serving API and spatial query endpoints for HUBZone map
 *
 * Endpoints:
 * - GET  /api/v1/map/tiles/:z/:x/:y.pbf  - Generate Mapbox Vector Tiles
 * - POST /api/v1/hubzone/radius-search   - Search HUBZones within radius
 * - GET  /api/v1/hubzone/tract/:tractId  - Get tract details
 * - GET  /api/v1/hubzone/statistics      - Get HUBZone statistics
 * - POST /api/v1/hubzone/export          - Export HUBZone data
 */

import { Router } from 'express';
import { z } from 'zod';

import { mapService } from '../services/mapService.js';

import type { Request, Response, NextFunction } from 'express';
import type { HubzoneType, HubzoneStatus } from '../types/hubzone.js';
import type { ExportInput } from '../types/map.js';

const router = Router();

// ===== Validation Schemas =====

const tileParamsSchema = z.object({
  z: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0).max(22)),
  x: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)),
  y: z.string().regex(/^\d+\.pbf$/).transform((val: string) => parseInt(val.replace('.pbf', ''), 10)).pipe(z.number().min(0)),
});

const radiusSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_miles: z.number().min(0.1).max(100).default(10),
});

const tractIdSchema = z.object({
  tractId: z.string().regex(/^\d{11}$/, 'Tract ID must be 11-digit GEOID'),
});

const exportSchema = z.object({
  state: z.string().optional(),
  county: z.string().optional(),
  format: z.enum(['geojson', 'csv']).default('geojson'),
  zone_types: z.array(z.enum([
    'qualified_census_tract',
    'qualified_non_metro_county',
    'indian_lands',
    'base_closure_area',
    'governor_designated',
    'redesignated',
  ])).optional(),
  status_filter: z.array(z.enum(['active', 'expired', 'pending', 'redesignated'])).optional(),
});

// ===== Route Handlers =====

/**
 * GET /api/v1/map/tiles/:z/:x/:y.pbf
 *
 * Generate Mapbox Vector Tile (MVT) for the given tile coordinates.
 * Uses PostGIS ST_AsMVT function to generate Protocol Buffer format tiles.
 *
 * Response:
 * - Content-Type: application/x-protobuf
 * - Cache-Control: max-age=86400 (24 hours)
 * - Binary MVT data
 */
router.get(
  '/map/tiles/:z/:x/:y',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate parameters
      const parseResult = tileParamsSchema.safeParse(req.params);

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid tile coordinates',
          details: parseResult.error.issues,
        });
        return;
      }

      const { z, x, y } = parseResult.data;

      // Validate tile coordinates are within bounds for zoom level
      const maxTile = Math.pow(2, z) - 1;
      if (x > maxTile || y > maxTile) {
        res.status(400).json({
          error: 'Tile coordinates out of bounds for zoom level',
          details: { z, x, y, maxTile },
        });
        return;
      }

      // Generate vector tile
      const mvtData = await mapService.generateVectorTile({ z, x, y });

      // Set appropriate headers
      res.set({
        'Content-Type': 'application/x-protobuf',
        'Content-Encoding': 'identity',
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Encoding',
      });

      // Handle empty tiles
      if (mvtData.length === 0) {
        res.status(204).end();
        return;
      }

      res.send(mvtData);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/hubzone/radius-search
 *
 * Search for HUBZone tracts within a radius of a given point.
 *
 * Request body:
 * {
 *   latitude: number,      // -90 to 90
 *   longitude: number,     // -180 to 180
 *   radius_miles: number   // 0.1 to 100, default 10
 * }
 *
 * Response:
 * {
 *   center: { latitude, longitude },
 *   radiusMiles: number,
 *   results: HUBZone[],
 *   totalCount: number
 * }
 */
router.post(
  '/hubzone/radius-search',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = radiusSearchSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid search parameters',
          details: parseResult.error.issues,
        });
        return;
      }

      const { latitude, longitude, radius_miles } = parseResult.data;

      // Perform radius search
      const result = await mapService.radiusSearch({
        latitude,
        longitude,
        radiusMiles: radius_miles,
      });

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/hubzone/tract/:tractId
 *
 * Get detailed information about a specific Census tract.
 *
 * Parameters:
 * - tractId: 11-digit Census tract GEOID
 *
 * Response:
 * {
 *   id, geoid, name, zoneType, status, state, county,
 *   designationDate, expirationDate, isRedesignated,
 *   gracePeriodEndDate, geometry (GeoJSON),
 *   designationHistory[], businessCount, areaSquareMiles
 * }
 */
router.get(
  '/hubzone/tract/:tractId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate tract ID
      const parseResult = tractIdSchema.safeParse(req.params);

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid tract ID',
          details: parseResult.error.issues,
          hint: 'Tract ID must be an 11-digit GEOID (e.g., 06037100100)',
        });
        return;
      }

      const { tractId } = parseResult.data;

      // Get tract details
      const tract = await mapService.getTractDetails(tractId);

      if (!tract) {
        res.status(404).json({
          error: 'Tract not found',
          tractId,
        });
        return;
      }

      res.json({
        success: true,
        data: tract,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/hubzone/statistics
 *
 * Get aggregate statistics about HUBZone designations.
 *
 * Response:
 * {
 *   totalTracts, designatedTracts, activeTracts,
 *   byType: { qct, qnmc, indianLands, ... },
 *   byStatus: { active, expired, pending, redesignated },
 *   lastUpdateDate, lastImportId,
 *   topStatesByBusinessCount[],
 *   totalCertifiedBusinesses
 * }
 */
router.get(
  '/hubzone/statistics',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statistics = await mapService.getStatistics();

      res.json({
        success: true,
        data: statistics,
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/hubzone/export
 *
 * Export HUBZone data for a region in GeoJSON or CSV format.
 *
 * Request body:
 * {
 *   state?: string,           // Optional state filter
 *   county?: string,          // Optional county filter
 *   format: 'geojson' | 'csv', // Export format
 *   zone_types?: string[],    // Optional zone type filter
 *   status_filter?: string[]  // Optional status filter
 * }
 *
 * Response:
 * - GeoJSON: application/geo+json
 * - CSV: text/csv
 * - Content-Disposition: attachment; filename="..."
 */
router.post(
  '/hubzone/export',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = exportSchema.safeParse(req.body);

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid export parameters',
          details: parseResult.error.issues,
        });
        return;
      }

      const { state, county, format, zone_types, status_filter } = parseResult.data;

      // Export data

      const exportInput: ExportInput = {
        state,
        county,
        format,
        zoneTypes: zone_types as HubzoneType[],
        statusFilter: status_filter as HubzoneStatus[],
      };

      const result = await mapService.exportData(exportInput);

      // Set response headers
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Record-Count': result.recordCount.toString(),
      });

      // Send data
      res.send(result.data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/map/cache/stats
 *
 * Get tile cache statistics (for monitoring).
 */
router.get(
  '/map/cache/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = mapService.getTileCacheStats();

      res.json({
        success: true,
        data: {
          ...stats,
          cacheEnabled: true,
          ttlSeconds: 86400,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/map/cache/clear
 *
 * Clear the tile cache (admin only in production).
 */
router.post(
  '/map/cache/clear',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      mapService.clearTileCache();

      res.json({
        success: true,
        message: 'Tile cache cleared successfully',
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/hubzone/bounds
 *
 * Get bounding box for all HUBZone data (useful for map initialization).
 */
router.get(
  '/hubzone/bounds',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { db } = await import('../services/database.js');

      const query = `
        SELECT 
          ST_XMin(ST_Extent(geometry)) as min_lng,
          ST_YMin(ST_Extent(geometry)) as min_lat,
          ST_XMax(ST_Extent(geometry)) as max_lng,
          ST_YMax(ST_Extent(geometry)) as max_lat
        FROM hubzones
        WHERE status IN ('active', 'redesignated')
      `;

      const result = await db.query<{
        min_lng: number;
        min_lat: number;
        max_lng: number;
        max_lat: number;
      }>(query);

      const bounds = result.rows[0];

      if (!bounds || bounds.min_lng === null) {
        res.status(404).json({
          error: 'No HUBZone data available',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          bounds: [
            [bounds.min_lng, bounds.min_lat],
            [bounds.max_lng, bounds.max_lat],
          ],
          center: [
            (bounds.min_lng + bounds.max_lng) / 2,
            (bounds.min_lat + bounds.max_lat) / 2,
          ],
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/hubzone/states
 *
 * Get list of states with HUBZone designations.
 */
router.get(
  '/hubzone/states',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { db } = await import('../services/database.js');

      const query = `
        SELECT DISTINCT state, COUNT(*) as tract_count
        FROM hubzones
        WHERE status IN ('active', 'redesignated')
        GROUP BY state
        ORDER BY state
      `;

      const result = await db.query<{
        state: string;
        tract_count: string;
      }>(query);

      res.json({
        success: true,
        data: result.rows.map((row: { state: string; tract_count: string }) => ({
          state: row.state,
          tractCount: parseInt(row.tract_count, 10),
        })),
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/hubzone/counties/:state
 *
 * Get list of counties with HUBZone designations for a state.
 */
router.get(
  '/hubzone/counties/:state',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { state } = req.params;

      if (!state) {
        res.status(400).json({
          error: 'State parameter is required',
        });
        return;
      }

      const { db } = await import('../services/database.js');

      const query = `
        SELECT DISTINCT county, COUNT(*) as tract_count
        FROM hubzones
        WHERE state = $1 AND status IN ('active', 'redesignated')
        GROUP BY county
        ORDER BY county
      `;

      const result = await db.query<{
        county: string;
        tract_count: string;
      }>(query, [state]);

      res.json({
        success: true,
        data: result.rows.map((row: { county: string; tract_count: string }) => ({
          county: row.county,
          tractCount: parseInt(row.tract_count, 10),
        })),
        meta: {
          state,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

