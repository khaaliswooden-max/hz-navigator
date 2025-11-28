/**
 * Authentication API Integration Tests
 */

import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import authRoutes from '../../../src/routes/auth';
import { mockDb, createMockQueryResult, resetDatabaseMock } from '../../mocks/database';
import { testUsers } from '../../fixtures';

// Mock the database module
jest.mock('../../../src/services/database', () => ({
  db: require('../../mocks/database').mockDb,
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashed.password'),
  compare: jest.fn(),
}));

// Mock audit service
jest.mock('../../../src/services/auditService', () => ({
  auditService: {
    logAuth: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue('log-id'),
  },
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: err.message });
});

describe('Authentication API', () => {
  beforeEach(() => {
    resetDatabaseMock();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = {
        id: testUsers.user.id,
        email: testUsers.user.email,
        password_hash: testUsers.user.passwordHash,
        first_name: testUsers.user.firstName,
        last_name: testUsers.user.lastName,
        role: testUsers.user.role,
        is_active: true,
      };

      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('SELECT') && text.includes('FROM users')) {
          return createMockQueryResult([user]);
        }
        if (text.includes('UPDATE users SET last_login_at')) {
          return createMockQueryResult([]);
        }
        return createMockQueryResult([]);
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.user.email,
          password: testUsers.user.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUsers.user.email);
    });

    it('should return 401 for invalid email', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for invalid password', async () => {
      const user = {
        id: testUsers.user.id,
        email: testUsers.user.email,
        password_hash: testUsers.user.passwordHash,
        first_name: testUsers.user.firstName,
        last_name: testUsers.user.lastName,
        role: testUsers.user.role,
        is_active: true,
      };

      mockDb.query.mockResolvedValue(createMockQueryResult([user]));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.user.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for inactive user', async () => {
      const inactiveUser = {
        id: testUsers.inactiveUser.id,
        email: testUsers.inactiveUser.email,
        password_hash: testUsers.inactiveUser.passwordHash,
        first_name: testUsers.inactiveUser.firstName,
        last_name: testUsers.inactiveUser.lastName,
        role: testUsers.inactiveUser.role,
        is_active: false,
      };

      mockDb.query.mockResolvedValue(createMockQueryResult([inactiveUser]));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.inactiveUser.email,
          password: testUsers.inactiveUser.password,
        })
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_DISABLED');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'password',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('SELECT') && text.includes('FROM users WHERE email')) {
          return createMockQueryResult([]);
        }
        if (text.includes('INSERT INTO users')) {
          return createMockQueryResult([{ id: 'new-user-id' }]);
        }
        return createMockQueryResult([]);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('newuser@test.com');
    });

    it('should return 409 for existing email', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([{ id: 'existing-id' }]));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUsers.user.email,
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'weak', // Too short, no uppercase, no special char
          firstName: 'New',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should return 400 for missing firstName', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      mockDb.query.mockImplementation(async (text: string) => {
        if (text.includes('SELECT')) {
          return createMockQueryResult([]);
        }
        if (text.includes('INSERT INTO users')) {
          return createMockQueryResult([{ id: 'new-user-id' }]);
        }
        return createMockQueryResult([]);
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'UPPERCASE@TEST.COM',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('uppercase@test.com');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success even for non-existent email (prevent enumeration)', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([]));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account');
    });

    it('should return success for existing email', async () => {
      mockDb.query.mockResolvedValue(createMockQueryResult([{ id: testUsers.user.id }]));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUsers.user.email })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      // The authenticate middleware should block this
    });
  });
});

