/**
 * HUBZones API Integration Tests
 */

import request from 'supertest';
import express from 'express';
import hubzoneRoutes from '../../../src/routes/hubzones';
import { mockDb, createMockQueryResult, resetDatabaseMock } from '../../mocks/database';
import { testHubzones } from '../../fixtures';

// Mock the database module
jest.mock('../../../src/services/database', () => ({
  db: require('../../mocks/database').mockDb,
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/hubzones', hubzoneRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: err.message });
});

describe('HUBZones API', () => {
  beforeEach(() => {
    resetDatabaseMock();
  });

  describe('GET /api/hubzones', () => {
    it('should return paginated hubzones', async () => {
      const mockHubzones = [
        { ...testHubzones.qct, geometry: '{}' },
        { ...testHubzones.qnmc, geometry: '{}' },
      ];

      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ count: '2' }]);
        }
        return createMockQueryResult(mockHubzones);
      });

      const response = await request(app)
        .get('/api/hubzones')
        .query({ page: 1, limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBe(2);
    });

    it('should support search parameter', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ count: '1' }]);
        }
        return createMockQueryResult([{ ...testHubzones.qct, geometry: '{}' }]);
      });

      const response = await request(app)
        .get('/api/hubzones')
        .query({ search: 'Baltimore' })
        .expect(200);

      expect(response.body.pagination.total).toBe(1);
    });

    it('should use default pagination when not specified', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)')) {
          return createMockQueryResult([{ count: '0' }]);
        }
        return createMockQueryResult([]);
      });

      const response = await request(app)
        .get('/api/hubzones')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBeGreaterThan(0);
    });
  });

  describe('GET /api/hubzones/:id', () => {
    it('should return a hubzone by ID', async () => {
      mockDb.query.mockResolvedValue(
        createMockQueryResult([{ ...testHubzones.qct, geometry: '{}' }])
      );

      const response = await request(app)
        .get(`/api/hubzones/${testHubzones.qct.id}`)
        .expect(200);

      expect(response.body.data.id).toBe(testHubzones.qct.id);
      expect(response.body.data.name).toBe(testHubzones.qct.name);
    });

    it('should return 404 for non-existent hubzone', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const response = await request(app)
        .get('/api/hubzones/non-existent-id')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/hubzones/check', () => {
    it('should check if location is in hubzone', async () => {
      mockDb.query.mockResolvedValue(
        createMockQueryResult([{
          id: testHubzones.qct.id,
          name: testHubzones.qct.name,
          zone_type: testHubzones.qct.zoneType,
          state: testHubzones.qct.state,
          county: testHubzones.qct.county,
          status: testHubzones.qct.status,
        }])
      );

      const response = await request(app)
        .get('/api/hubzones/check')
        .query({ latitude: 39.2904, longitude: -76.6122 })
        .expect(200);

      expect(response.body.data.isInHubzone).toBe(true);
      expect(response.body.data.matchingZones).toHaveLength(1);
    });

    it('should return isInHubzone=false for non-hubzone location', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const response = await request(app)
        .get('/api/hubzones/check')
        .query({ latitude: 40.7128, longitude: -74.006 })
        .expect(200);

      expect(response.body.data.isInHubzone).toBe(false);
      expect(response.body.data.matchingZones).toHaveLength(0);
    });

    it('should return 400 for missing coordinates', async () => {
      const response = await request(app)
        .get('/api/hubzones/check')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid latitude', async () => {
      const response = await request(app)
        .get('/api/hubzones/check')
        .query({ latitude: 'invalid', longitude: -76.6122 })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for out-of-range coordinates', async () => {
      const response = await request(app)
        .get('/api/hubzones/check')
        .query({ latitude: 100, longitude: -76.6122 }) // Latitude must be -90 to 90
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/hubzones/stats', () => {
    it('should return hubzone statistics', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('COUNT(*)') && text.includes('total')) {
          return createMockQueryResult([{ total: '100' }]);
        }
        if (text.includes('zone_type')) {
          return createMockQueryResult([
            { zone_type: 'qualified_census_tract', count: '50' },
            { zone_type: 'qualified_non_metro_county', count: '30' },
            { zone_type: 'indian_lands', count: '20' },
          ]);
        }
        if (text.includes('state')) {
          return createMockQueryResult([
            { state: 'MD', count: '15' },
            { state: 'VA', count: '12' },
          ]);
        }
        return createMockQueryResult([]);
      });

      const response = await request(app)
        .get('/api/hubzones/stats')
        .expect(200);

      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byType');
    });
  });
});

