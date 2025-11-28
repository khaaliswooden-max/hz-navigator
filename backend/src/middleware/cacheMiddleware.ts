/**
 * Cache Middleware
 * 
 * Provides caching capabilities for API responses:
 * - ETag-based conditional requests
 * - Cache-Control headers
 * - Response caching
 */

import type { Request, Response, NextFunction } from 'express';
import { cacheService, CACHE_TTL, CACHE_PREFIX } from '../services/cacheService.js';

// ===== Types =====

export interface CacheOptions {
  ttl: number;
  private?: boolean;
  key?: string | ((req: Request) => string);
  vary?: string[];
  staleWhileRevalidate?: number;
}

// ===== Helper Functions =====

function generateCacheKey(req: Request, customKey?: string | ((req: Request) => string)): string {
  if (customKey) {
    return typeof customKey === 'function' ? customKey(req) : customKey;
  }
  
  // Default key: method + path + sorted query params
  const queryString = Object.keys(req.query)
    .sort()
    .map(k => `${k}=${req.query[k]}`)
    .join('&');
  
  return `${req.method}:${req.path}${queryString ? ':' + queryString : ''}`;
}

function setResponseCacheHeaders(
  res: Response,
  options: CacheOptions,
  etag?: string
): void {
  const directives: string[] = [];
  
  // Private vs public cache
  directives.push(options.private ? 'private' : 'public');
  
  // Max age
  directives.push(`max-age=${options.ttl}`);
  
  // Stale while revalidate
  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
  }
  
  res.setHeader('Cache-Control', directives.join(', '));
  
  // ETag header
  if (etag) {
    res.setHeader('ETag', etag);
  }
  
  // Vary header for cache key variations
  if (options.vary && options.vary.length > 0) {
    res.setHeader('Vary', options.vary.join(', '));
  }
}

// ===== Middleware Factory =====

/**
 * Create cache middleware with custom options
 */
export function cache(options: CacheOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `${CACHE_PREFIX.ETAG}${generateCacheKey(req, options.key)}`;
    
    try {
      // Check for cached response
      const cached = await cacheService.get<{
        data: unknown;
        etag: string;
        contentType: string;
      }>(cacheKey);
      
      if (cached) {
        // Check If-None-Match header (ETag)
        const ifNoneMatch = req.headers['if-none-match'];
        
        if (ifNoneMatch && cacheService.checkEtag(cached.etag, ifNoneMatch)) {
          // Client has current version - return 304 Not Modified
          res.status(304);
          setResponseCacheHeaders(res, options, cached.etag);
          res.end();
          return;
        }
        
        // Return cached response
        setResponseCacheHeaders(res, options, cached.etag);
        res.setHeader('X-Cache', 'HIT');
        
        if (cached.contentType) {
          res.setHeader('Content-Type', cached.contentType);
        }
        
        res.json(cached.data);
        return;
      }
      
      // Cache miss - capture response
      res.setHeader('X-Cache', 'MISS');
      
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(data: unknown) {
        // Generate ETag
        const etag = cacheService.generateEtag(data);
        
        // Set cache headers
        setResponseCacheHeaders(res, options, etag);
        
        // Cache the response (don't await)
        cacheService.set(cacheKey, {
          data,
          etag,
          contentType: res.getHeader('Content-Type') as string,
        }, options.ttl).catch(err => {
          console.error('Failed to cache response:', err);
        });
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      // On cache error, continue without caching
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// ===== Pre-configured Cache Middlewares =====

/**
 * Cache for HUBZone location checks (1 hour)
 */
export const cacheHubzoneCheck = cache({
  ttl: CACHE_TTL.HUBZONE_CHECK,
  key: (req) => `hubzone:${req.query['latitude']}:${req.query['longitude']}`,
  vary: ['Accept'],
});

/**
 * Cache for HUBZone listings (5 minutes)
 */
export const cacheHubzoneList = cache({
  ttl: CACHE_TTL.DEFAULT,
  vary: ['Accept'],
  staleWhileRevalidate: 60,
});

/**
 * Cache for compliance data (1 hour, private)
 */
export const cacheCompliance = cache({
  ttl: CACHE_TTL.COMPLIANCE,
  private: true,
  key: (req) => {
    const user = (req as Request & { user?: { userId?: string } }).user;
    return `compliance:${user?.userId}:${req.params['id'] || 'list'}`;
  },
  vary: ['Authorization'],
});

/**
 * Cache for dashboard stats (5 minutes)
 */
export const cacheDashboard = cache({
  ttl: CACHE_TTL.DASHBOARD_STATS,
  private: true,
  key: (req) => {
    const user = (req as Request & { user?: { userId?: string } }).user;
    return `dashboard:${user?.userId}`;
  },
  vary: ['Authorization'],
});

/**
 * No-cache middleware for sensitive endpoints
 */
export function noCache(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

/**
 * Invalidate cache for a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  await cacheService.deletePattern(pattern);
}

export default cache;

