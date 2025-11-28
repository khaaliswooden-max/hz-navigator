/**
 * Health API Integration Tests
 */

import request from 'supertest';
import express from 'express';
import healthRoutes from '../../../src/routes/health';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/health', healthRoutes);

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include environment info', async () => {
      const response = await request(app).get('/api/health');

      expect(response.body).toHaveProperty('environment');
    });
  });
});

