import { db } from './database.js';

import type { Hubzone, HubzoneListResult, LocationCheckResult } from '../types/hubzone.js';

interface FindAllOptions {
  page: number;
  limit: number;
  search?: string;
}

export class HubzoneService {
  /**
   * Find all HUBZones with pagination
   */
  async findAll(options: FindAllOptions): Promise<HubzoneListResult> {
    const { page, limit, search } = options;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: unknown[] = [limit, offset];

    if (search) {
      whereClause = 'WHERE name ILIKE $3 OR county ILIKE $3 OR state ILIKE $3';
      params.push(`%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) FROM hubzones ${whereClause}`;
    const dataQuery = `
      SELECT 
        id, name, zone_type, state, county, 
        designation_date, expiration_date, status,
        ST_AsGeoJSON(geometry) as geometry,
        created_at, updated_at
      FROM hubzones 
      ${whereClause}
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `;

    const [countResult, dataResult] = await Promise.all([
      db.query<{ count: string }>(countQuery, search ? [`%${search}%`] : []),
      db.query<Hubzone>(dataQuery, params),
    ]);

    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a HUBZone by ID
   */
  async findById(id: string): Promise<Hubzone | null> {
    const query = `
      SELECT 
        id, name, zone_type, state, county,
        designation_date, expiration_date, status,
        ST_AsGeoJSON(geometry) as geometry,
        created_at, updated_at
      FROM hubzones 
      WHERE id = $1
    `;

    const result = await db.query<Hubzone>(query, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * Check if a location is within a HUBZone
   */
  async checkLocation(
    latitude: number,
    longitude: number
  ): Promise<LocationCheckResult> {
    const query = `
      SELECT 
        id, name, zone_type, state, county, status
      FROM hubzones 
      WHERE ST_Contains(
        geometry, 
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      )
      AND status = 'active'
    `;

    const result = await db.query<Hubzone>(query, [longitude, latitude]);

    return {
      isInHubzone: result.rows.length > 0,
      coordinates: { latitude, longitude },
      matchingZones: result.rows,
      checkedAt: new Date().toISOString(),
    };
  }
}

