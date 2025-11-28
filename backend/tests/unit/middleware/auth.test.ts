/**
 * Authentication Middleware Unit Tests
 */

import { authenticate, requireRole, generateToken } from '../../../src/middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../../src/middleware/auth';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

import jwt from 'jsonwebtoken';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next() with valid token', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user' as const,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockRequest.headers = { authorization: 'Bearer valid-token' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockPayload);
    });

    it('should return 401 when no token provided', () => {
      mockRequest.headers = {};

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401,
        })
      );
    });

    it('should return 401 when token format is invalid', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No token provided',
          statusCode: 401,
        })
      );
    });

    it('should return 401 when token is invalid', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 401,
        })
      );
    });

    it('should return 401 when token is expired', () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      mockRequest.headers = { authorization: 'Bearer expired-token' };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid or expired token',
          statusCode: 401,
        })
      );
    });
  });

  describe('requireRole', () => {
    it('should call next() when user has required role', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when user has one of multiple required roles', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'reviewer@example.com',
        role: 'reviewer',
      };

      const middleware = requireRole('admin', 'reviewer');
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should return 401 when user is not authenticated', () => {
      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication required',
          statusCode: 401,
        })
      );
    });

    it('should return 403 when user lacks required role', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Insufficient permissions',
          statusCode: 403,
        })
      );
    });

    it('should return 403 when user role not in allowed list', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      const middleware = requireRole('admin', 'reviewer');
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
        })
      );
    });
  });

  describe('generateToken', () => {
    it('should generate a token with user payload', () => {
      const mockToken = 'generated-jwt-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user' as const,
      };

      const token = generateToken(payload);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.any(String) })
      );
    });

    it('should use environment variable for expiration', () => {
      process.env['JWT_EXPIRES_IN'] = '24h';
      const mockToken = 'token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      generateToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({ expiresIn: '24h' })
      );
    });
  });
});

