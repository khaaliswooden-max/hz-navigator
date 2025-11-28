/**
 * Cache Service
 * 
 * Provides caching capabilities using Redis or in-memory fallback.
 * 
 * Cache strategies:
 * - HUBZone map tiles: 24 hours
 * - Compliance calculations: 1 hour
 * - Verified addresses: 90 days
 * - Session data: Redis-based
 * - API responses: ETags
 */

import crypto from 'crypto';

// ===== Types =====

export interface CacheConfig {
  provider: 'redis' | 'memory';
  redisUrl?: string;
  defaultTtlSeconds: number;
}

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  etag: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// ===== Cache TTL Constants (in seconds) =====

export const CACHE_TTL = {
  HUBZONE_TILES: 24 * 60 * 60,        // 24 hours
  COMPLIANCE: 60 * 60,                 // 1 hour
  VERIFIED_ADDRESS: 90 * 24 * 60 * 60, // 90 days
  SESSION: 24 * 60 * 60,               // 24 hours
  DASHBOARD_STATS: 5 * 60,             // 5 minutes
  USER_PROFILE: 15 * 60,               // 15 minutes
  HUBZONE_CHECK: 60 * 60,              // 1 hour
  DEFAULT: 5 * 60,                     // 5 minutes
} as const;

// ===== Cache Key Prefixes =====

export const CACHE_PREFIX = {
  HUBZONE: 'hz:',
  COMPLIANCE: 'comp:',
  ADDRESS: 'addr:',
  SESSION: 'sess:',
  DASHBOARD: 'dash:',
  USER: 'user:',
  ETAG: 'etag:',
} as const;

// ===== In-Memory Cache Implementation =====

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  
  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data as T;
  }
  
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      etag: this.generateEtag(value),
    };
    
    this.cache.set(key, entry);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }
  
  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  
  async getEtag(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return entry.etag;
  }
  
  async getTtl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist
    
    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1; // -1 means expired
  }
  
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }
  
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  private evictOldest(): void {
    // Evict 10% of entries (oldest first based on creation time)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    const toEvict = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toEvict; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  
  private generateEtag(data: unknown): string {
    const str = JSON.stringify(data);
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
  }
}

// ===== Redis Cache Implementation (Placeholder) =====

class RedisCache {
  private connected = false;
  private memoryFallback: MemoryCache;
  
  constructor(_redisUrl: string) {
    this.memoryFallback = new MemoryCache();
    
    // In production, this would connect to Redis
    console.info('[Cache] Redis not configured, using in-memory cache');
    
    /* Production Redis implementation would be:
    import { createClient } from 'redis';
    
    this.client = createClient({ url: redisUrl });
    this.client.on('error', (err) => console.error('Redis error:', err));
    this.client.connect().then(() => {
      this.connected = true;
      console.info('[Cache] Connected to Redis');
    });
    */
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) {
      return this.memoryFallback.get<T>(key);
    }
    // Redis get implementation
    return null;
  }
  
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.connected) {
      return this.memoryFallback.set(key, value, ttlSeconds);
    }
    // Redis set implementation
  }
  
  async delete(key: string): Promise<boolean> {
    if (!this.connected) {
      return this.memoryFallback.delete(key);
    }
    return false;
  }
  
  async deletePattern(pattern: string): Promise<number> {
    if (!this.connected) {
      return this.memoryFallback.deletePattern(pattern);
    }
    return 0;
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return this.memoryFallback.exists(key);
    }
    return false;
  }
  
  async getEtag(key: string): Promise<string | null> {
    if (!this.connected) {
      return this.memoryFallback.getEtag(key);
    }
    return null;
  }
  
  async getTtl(key: string): Promise<number> {
    if (!this.connected) {
      return this.memoryFallback.getTtl(key);
    }
    return -2;
  }
  
  getStats(): CacheStats {
    return this.memoryFallback.getStats();
  }
  
  clear(): void {
    this.memoryFallback.clear();
  }
}

// ===== Cache Service =====

class CacheService {
  private cache: MemoryCache | RedisCache;
  
  constructor() {
    const redisUrl = process.env['REDIS_URL'];
    
    if (redisUrl) {
      this.cache = new RedisCache(redisUrl);
    } else {
      this.cache = new MemoryCache();
    }
  }
  
  // ===== Generic Cache Methods =====
  
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }
  
  async set<T>(key: string, value: T, ttlSeconds = CACHE_TTL.DEFAULT): Promise<void> {
    return this.cache.set(key, value, ttlSeconds);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }
  
  async deletePattern(pattern: string): Promise<number> {
    return this.cache.deletePattern(pattern);
  }
  
  async exists(key: string): Promise<boolean> {
    return this.cache.exists(key);
  }
  
  async getEtag(key: string): Promise<string | null> {
    return this.cache.getEtag(key);
  }
  
  async getTtl(key: string): Promise<number> {
    return this.cache.getTtl(key);
  }
  
  getStats(): CacheStats {
    return this.cache.getStats();
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // ===== Specialized Cache Methods =====
  
  /**
   * Cache HUBZone location check result
   */
  async cacheHubzoneCheck(
    lat: number,
    lng: number,
    result: unknown
  ): Promise<void> {
    const key = `${CACHE_PREFIX.HUBZONE}check:${lat.toFixed(6)}:${lng.toFixed(6)}`;
    await this.set(key, result, CACHE_TTL.HUBZONE_CHECK);
  }
  
  async getHubzoneCheck(lat: number, lng: number): Promise<unknown | null> {
    const key = `${CACHE_PREFIX.HUBZONE}check:${lat.toFixed(6)}:${lng.toFixed(6)}`;
    return this.get(key);
  }
  
  /**
   * Cache compliance calculation
   */
  async cacheCompliance(businessId: string, compliance: unknown): Promise<void> {
    const key = `${CACHE_PREFIX.COMPLIANCE}${businessId}`;
    await this.set(key, compliance, CACHE_TTL.COMPLIANCE);
  }
  
  async getCompliance(businessId: string): Promise<unknown | null> {
    const key = `${CACHE_PREFIX.COMPLIANCE}${businessId}`;
    return this.get(key);
  }
  
  async invalidateCompliance(businessId: string): Promise<void> {
    const key = `${CACHE_PREFIX.COMPLIANCE}${businessId}`;
    await this.delete(key);
  }
  
  /**
   * Cache verified address
   */
  async cacheVerifiedAddress(
    address: string,
    result: unknown
  ): Promise<void> {
    const hash = crypto.createHash('md5').update(address.toLowerCase()).digest('hex');
    const key = `${CACHE_PREFIX.ADDRESS}${hash}`;
    await this.set(key, result, CACHE_TTL.VERIFIED_ADDRESS);
  }
  
  async getVerifiedAddress(address: string): Promise<unknown | null> {
    const hash = crypto.createHash('md5').update(address.toLowerCase()).digest('hex');
    const key = `${CACHE_PREFIX.ADDRESS}${hash}`;
    return this.get(key);
  }
  
  /**
   * Cache dashboard statistics
   */
  async cacheDashboardStats(userId: string, stats: unknown): Promise<void> {
    const key = `${CACHE_PREFIX.DASHBOARD}${userId}`;
    await this.set(key, stats, CACHE_TTL.DASHBOARD_STATS);
  }
  
  async getDashboardStats(userId: string): Promise<unknown | null> {
    const key = `${CACHE_PREFIX.DASHBOARD}${userId}`;
    return this.get(key);
  }
  
  /**
   * Cache user profile
   */
  async cacheUserProfile(userId: string, profile: unknown): Promise<void> {
    const key = `${CACHE_PREFIX.USER}profile:${userId}`;
    await this.set(key, profile, CACHE_TTL.USER_PROFILE);
  }
  
  async getUserProfile(userId: string): Promise<unknown | null> {
    const key = `${CACHE_PREFIX.USER}profile:${userId}`;
    return this.get(key);
  }
  
  async invalidateUserProfile(userId: string): Promise<void> {
    await this.deletePattern(`${CACHE_PREFIX.USER}*${userId}*`);
  }
  
  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await fetchFn();
    await this.set(key, data, ttlSeconds);
    return data;
  }
  
  /**
   * Generate ETag for response
   */
  generateEtag(data: unknown): string {
    const str = JSON.stringify(data);
    return `"${crypto.createHash('md5').update(str).digest('hex').substring(0, 16)}"`;
  }
  
  /**
   * Check if ETag matches (for conditional requests)
   */
  checkEtag(currentEtag: string, ifNoneMatch: string | undefined): boolean {
    if (!ifNoneMatch) return false;
    return currentEtag === ifNoneMatch || ifNoneMatch === '*';
  }
}

// ===== Export Singleton =====

export const cacheService = new CacheService();
export default cacheService;

